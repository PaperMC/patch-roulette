import { Hono, type Context } from "hono";
import { vValidator } from "@hono/valibot-validator";
import * as v from "valibot";
import { patchSchema, usernameSchema } from "../domain";
import { epochMilliseconds, minecraftVersionSchema, nonEmptyString } from "../schemas";
import { extractAccessIdentity, type ExternalIdentity } from "./auth";
import { patchDescription, type PatchRoulette } from "./patch-roulette";
import { type Env, type Principal } from "./types";

type ApiEnvironment = {
    Bindings: Env;
    Variables: { principal: Principal };
};
type ApiOptions = {
    localIdentity?: ExternalIdentity;
    enforceSameOrigin?: boolean;
};
type ApiContext = Context<ApiEnvironment>;
type Database = DurableObjectStub<PatchRoulette>;

const patchIdSchema = v.strictObject({ minecraftVersion: minecraftVersionSchema, path: nonEmptyString });
const patchListSchema = v.strictObject({ minecraftVersion: minecraftVersionSchema, paths: v.pipe(v.array(nonEmptyString), v.minLength(1)) });
const minecraftVersionQuerySchema = v.object({ minecraftVersion: minecraftVersionSchema });

const database = (env: Env): Database => env.PATCH_ROULETTE.get(env.PATCH_ROULETTE.idFromName("primary"));
const currentUser = (c: ApiContext) => c.get("principal").user;
const empty = (c: ApiContext) => c.body(null, 204);

const createApi = ({ localIdentity, enforceSameOrigin = true }: ApiOptions = {}) => {
    const api = new Hono<ApiEnvironment>().basePath("/api");

    api.use("/*", async (c, next) => {
        const identity = localIdentity ?? extractAccessIdentity(c.req.raw);
        if (!identity) return c.text("Unauthorized", 401);
        c.set("principal", { user: await database(c.env).resolveOrProvisionUser(identity) });
        return next();
    });

    api.use("/*", async (c, next) => {
        if (enforceSameOrigin && !["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
            const origin = c.req.header("Origin");
            if (origin && origin !== new URL(c.req.raw.url).origin) return c.text("Forbidden", 403);
        }
        return next();
    });

    api.get("/me", (c) => c.json(currentUser(c)));
    api.patch("/me", vValidator("json", v.strictObject({ username: usernameSchema })), async (c) => {
        const user = await database(c.env).updateUsername(currentUser(c).id, c.req.valid("json").username);
        return user ? c.json(user) : c.text("User not found.", 404);
    });
    api.post("/me/claim-legacy", vValidator("json", v.strictObject({ username: nonEmptyString, password: nonEmptyString })), async (c) => {
        const input = c.req.valid("json");
        return (await database(c.env).claimLegacyUser(currentUser(c).id, input.username, input.password))
            ? empty(c)
            : c.text("Invalid legacy credentials.", 400);
    });

    api.get("/versions", async (c) => c.json(await database(c.env).versions()));
    api.get("/patches/available", vValidator("query", minecraftVersionQuerySchema), async (c) =>
        c.json(await database(c.env).available(c.req.valid("query").minecraftVersion)),
    );
    api.get("/patches", vValidator("query", minecraftVersionQuerySchema), async (c) =>
        c.json(await database(c.env).all(c.req.valid("query").minecraftVersion)),
    );
    api.post("/patches/init", vValidator("json", patchListSchema), async (c) => {
        const input = c.req.valid("json");
        return (await database(c.env).init(input.minecraftVersion, input.paths))
            ? empty(c)
            : c.text(`Patches for ${input.minecraftVersion} already exist; clear them before initializing again.`, 409);
    });
    api.post("/patches/clear", vValidator("json", v.strictObject({ minecraftVersion: minecraftVersionSchema })), async (c) => {
        await database(c.env).clear(c.req.valid("json").minecraftVersion);
        return empty(c);
    });
    api.post("/patches/start", vValidator("json", patchListSchema), async (c) => {
        const input = c.req.valid("json");
        const result = await database(c.env).start(input.minecraftVersion, input.paths, currentUser(c).id);
        if (result.status === "missing") return c.text(`${patchDescription(input.minecraftVersion, result.path)} was not found.`, 404);
        if (result.status === "conflict") return c.text(result.message, 409);
        return c.json(result.patches);
    });

    api.post("/patches/complete", vValidator("json", patchIdSchema), async (c) => {
        const { minecraftVersion, path } = c.req.valid("json");
        const result = await database(c.env).complete(minecraftVersion, path, currentUser(c).id);
        if (result.status === "missing") return c.text(`${patchDescription(minecraftVersion, path)} was not found.`, 404);
        if (result.status === "conflict") return c.text(result.message, 409);
        return c.json(result.patch);
    });
    api.post("/patches/cancel", vValidator("json", patchIdSchema), async (c) => {
        const { minecraftVersion, path } = c.req.valid("json");
        const result = await database(c.env).cancel(minecraftVersion, path);
        if (result.status === "missing") return c.text(`${patchDescription(minecraftVersion, path)} was not found.`, 404);
        if (result.status === "conflict") return c.text(result.message, 409);
        return c.json(result.patch);
    });
    api.post("/patches/undo", vValidator("json", patchIdSchema), async (c) => {
        const { minecraftVersion, path } = c.req.valid("json");
        const result = await database(c.env).undo(minecraftVersion, path, currentUser(c).id);
        if (result.status === "missing") return c.text(`${patchDescription(minecraftVersion, path)} was not found.`, 404);
        if (result.status === "conflict") return c.text(result.message, 409);
        return c.json(result.patch);
    });

    api.get("/stats", vValidator("query", minecraftVersionQuerySchema), async (c) =>
        c.json(await database(c.env).stats(c.req.valid("query").minecraftVersion)),
    );
    api.post(
        "/import-legacy-data",
        vValidator(
            "json",
            v.strictObject({
                exportedAt: epochMilliseconds,
                legacyUsers: v.array(v.strictObject({ username: nonEmptyString, passwordHash: nonEmptyString })),
                patches: v.pipe(v.array(patchSchema), v.minLength(1)),
            }),
            (result, c) => {
                if (!result.success) return; // schema failures already produce a detailed valibot error
                // The schema can't catch duplicate usernames/patch keys or future timestamps, so reject them here.
                const { legacyUsers, patches } = result.output;
                const usernames = new Set<string>();
                for (const user of legacyUsers) {
                    if (usernames.has(user.username)) return c.text(`Duplicate username "${user.username}" in legacy data payload.`, 400);
                    usernames.add(user.username);
                }
                const keys = new Set<string>();
                for (const patch of patches) {
                    if (patch.updatedAt > Date.now()) return c.text(`Patch ${patch.minecraftVersion}/${patch.path} has a future updatedAt timestamp.`, 400);
                    const key = `${patch.minecraftVersion}\u0000${patch.path}`;
                    if (keys.has(key)) return c.text(`Duplicate patch ${patch.minecraftVersion}/${patch.path} in legacy data payload.`, 400);
                    keys.add(key);
                }
            },
        ),
        async (c) => {
            const data = c.req.valid("json");
            return (await database(c.env).importLegacyData(data.patches, data.legacyUsers))
                ? empty(c)
                : c.text("Patch data already exists; legacy import is only allowed before patches are added.", 409);
        },
    );

    return api;
};

const api = createApi();
const devApi = createApi({
    localIdentity: { issuer: "local-development", subject: "local-user" },
    enforceSameOrigin: false,
});

export const isApiRequest = (request: Request) => {
    const pathname = new URL(request.url).pathname;
    return pathname === "/api" || pathname.startsWith("/api/");
};
export const dispatchApi = (request: Request, env: Env, ctx: ExecutionContext) => api.fetch(request, env, ctx);
export const dispatchDevApi = (request: Request, env: Env, ctx: ExecutionContext) => devApi.fetch(request, env, ctx);
