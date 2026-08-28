import { SELF, reset } from "cloudflare:test";
import { hashSync } from "bcryptjs";
import { afterEach, describe, expect, it } from "vitest";

const origin = "https://patch-roulette.test";

const base64Url = (value: string) => btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const access = (subject = "alice") => ({
  "Cf-Access-Jwt-Assertion": `eyJhbGciOiJSUzI1NiJ9.${base64Url(JSON.stringify({ iss: "https://test.cloudflareaccess.com", sub: subject }))}.test`,
  Origin: origin,
});

const api = (path: string, init: RequestInit = {}) => SELF.fetch(`${origin}/api${path}`, init);
const json = (body: unknown, subject = "alice", method = "POST") => ({
  method,
  headers: { ...access(subject), "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const exportPatch = (overrides: Record<string, unknown> = {}) => ({
  minecraftVersion: "1.21.4",
  path: "first.patch",
  status: "DONE",
  responsibleUser: "old-alice",
  updatedAt: 1_700_000_000_000,
  duration: 5_000,
  ...overrides,
});
const exportPayload = (patches: Record<string, unknown>[], legacyUsers: Record<string, unknown>[] = []) => ({
  exportedAt: 1_700_000_000_000,
  legacyUsers,
  patches,
});

async function initPatches(paths = ["a.patch", "b.patch"]) {
  const response = await api("/patches/init", json({ minecraftVersion: "1.21.4", paths }));
  expect(response.status).toBe(204);
}

afterEach(reset);

describe("Patch Roulette API", () => {
  it("requires an Access assertion and provisions a stable identity", async () => {
    expect((await api("/me")).status).toBe(401);

    const first = await api("/me", { headers: access("alice") });
    const account = (await first.json()) as { id: string; username: string };
    expect(account).toMatchObject({ id: expect.any(String), username: expect.any(String) });

    const repeated = await api("/me", { headers: access("alice") });
    expect(await repeated.json()).toEqual(account);
    expect((await api("/me", { headers: access("bob") })).status).toBe(200);
  });

  it("renames users and records ownership by internal identity", async () => {
    const me = (await (await api("/me", { headers: access() })).json()) as { id: string };
    const renamed = await api("/me", json({ username: "redstone-wizard" }, "alice", "PATCH"));
    expect(await renamed.json()).toEqual({ id: me.id, username: "redstone-wizard" });

    await initPatches(["renamed.patch"]);
    expect((await api("/patches/start", json({ minecraftVersion: "1.21.4", paths: ["renamed.patch"] }))).status).toBe(
      200,
    );
    expect(await (await api("/patches?minecraftVersion=1.21.4", { headers: access() })).json()).toMatchObject([
      { path: "renamed.patch", responsibleUser: "redstone-wizard", updatedAt: expect.any(Number) },
    ]);
  });

  it("returns stable leaderboard user IDs when users share a username", async () => {
    await initPatches(["alice.patch", "bob.patch"]);
    await api("/patches/start", json({ minecraftVersion: "1.21.4", paths: ["alice.patch"] }, "alice"));
    await api("/patches/start", json({ minecraftVersion: "1.21.4", paths: ["bob.patch"] }, "bob"));
    await api("/me", json({ username: "same-name" }, "alice", "PATCH"));
    await api("/me", json({ username: "same-name" }, "bob", "PATCH"));

    const stats = (await (await api("/stats?minecraftVersion=1.21.4", { headers: access("alice") })).json()) as {
      leaderboard: Array<{ userId: string; username: string }>;
    };
    expect(stats.leaderboard).toHaveLength(2);
    expect(stats.leaderboard.every((entry) => entry.username === "same-name")).toBe(true);
    expect(new Set(stats.leaderboard.map((entry) => entry.userId)).size).toBe(2);
  });

  it("initializes each Minecraft version only once", async () => {
    const empty = await api("/patches/init", json({ minecraftVersion: "1.21.4", paths: [] }));
    expect(empty.status).toBe(400);

    await initPatches(["first.patch"]);
    const duplicate = await api("/patches/init", json({ minecraftVersion: "1.21.4", paths: ["second.patch"] }));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.text()).toBe("Patches for 1.21.4 already exist; clear them before initializing again.");

    expect((await api("/patches/clear", json({ minecraftVersion: "1.21.4" }))).status).toBe(204);
    expect((await api("/patches/init", json({ minecraftVersion: "1.21.4", paths: ["second.patch"] }))).status).toBe(
      204,
    );
  });

  it("serializes concurrent claims", async () => {
    await initPatches(["race.patch"]);
    const claim = () => api("/patches/start", json({ minecraftVersion: "1.21.4", paths: ["race.patch"] }));
    const responses = await Promise.all([claim(), claim()]);
    expect(responses.map((response) => response.status).sort((a, b) => a - b)).toEqual([200, 409]);
    const successful = responses.find((response) => response.status === 200);
    const conflict = responses.find((response) => response.status === 409);
    expect(successful).toBeDefined();
    expect(conflict).toBeDefined();
    expect(await successful!.json()).toMatchObject([{ path: "race.patch" }]);
  });

  it("rejects the whole claim when a requested patch is unavailable", async () => {
    await initPatches(["available.patch", "claimed.patch"]);
    expect(
      (await api("/patches/start", json({ minecraftVersion: "1.21.4", paths: ["claimed.patch"] }, "bob"))).status,
    ).toBe(200);

    const response = await api(
      "/patches/start",
      json({ minecraftVersion: "1.21.4", paths: ["available.patch", "claimed.patch"] }),
    );
    expect(response.status).toBe(409);
    expect(await (await api("/patches/available?minecraftVersion=1.21.4", { headers: access() })).json()).toEqual([
      "available.patch",
    ]);
  });

  it("rejects the whole claim when a requested patch does not exist", async () => {
    await initPatches(["known.patch"]);
    const response = await api(
      "/patches/start",
      json({ minecraftVersion: "1.21.4", paths: ["known.patch", "missing.patch"] }),
    );
    expect(response.status).toBe(409);
    expect(await (await api("/patches/available?minecraftVersion=1.21.4", { headers: access() })).json()).toEqual([
      "known.patch",
    ]);
  });

  it("preserves lifecycle duration and ownership rules", async () => {
    await initPatches(["lifecycle.patch"]);
    expect((await api("/patches/start", json({ minecraftVersion: "1.21.4", paths: ["lifecycle.patch"] }))).status).toBe(
      200,
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    expect((await api("/patches/complete", json({ minecraftVersion: "1.21.4", path: "lifecycle.patch" }))).status).toBe(
      200,
    );
    expect(
      (await api("/patches/undo", json({ minecraftVersion: "1.21.4", path: "lifecycle.patch" }, "bob"))).status,
    ).toBe(200);
    const wrongOwner = await api(
      "/patches/complete",
      json({ minecraftVersion: "1.21.4", path: "lifecycle.patch" }, "alice"),
    );
    expect(wrongOwner.status).toBe(409);
    expect(await wrongOwner.text()).toBe("You are not responsible for Patch 1.21.4/lifecycle.patch.");
    expect(
      (await api("/patches/cancel", json({ minecraftVersion: "1.21.4", path: "lifecycle.patch" }, "bob"))).status,
    ).toBe(200);
  });

  it("claims an imported legacy account once", async () => {
    const imported = await api(
      "/import-legacy-data",
      json({
        ...exportPayload([exportPatch({ status: "WIP", duration: null })]),
        legacyUsers: [{ username: "old-alice", passwordHash: hashSync("old-password", 4) }],
      }),
    );
    expect(imported.status).toBe(204);

    const claimed = await api("/me/claim-legacy", json({ username: "old-alice", password: "old-password" }));
    expect({ status: claimed.status, body: await claimed.text() }).toEqual({
      status: 204,
      body: "",
    });
    expect(await (await api("/patches?minecraftVersion=1.21.4", { headers: access() })).json()).toMatchObject([
      { path: "first.patch", responsibleUser: expect.any(String) },
    ]);
    expect(
      (await api("/me/claim-legacy", json({ username: "old-alice", password: "old-password" }, "bob"))).status,
    ).toBe(400);
    const repeat = await api("/me/claim-legacy", json({ username: "old-alice", password: "old-password" }));
    expect({ status: repeat.status, body: await repeat.text() }).toEqual({
      status: 409,
      body: "You have already claimed this legacy account.",
    });

    expect((await api("/patches/clear", json({ minecraftVersion: "1.21.4" }))).status).toBe(204);
    expect(
      (
        await api(
          "/import-legacy-data",
          json({
            ...exportPayload([exportPatch({ status: "WIP", duration: null })]),
            legacyUsers: [{ username: "old-alice", passwordHash: hashSync("old-password", 4) }],
          }),
        )
      ).status,
    ).toBe(409);
  });

  it("validates legacy imports and rejects a second import", async () => {
    const invalid = await api("/import-legacy-data", json(exportPayload([exportPatch(), exportPatch()])));
    expect({ status: invalid.status, body: await invalid.text() }).toEqual({
      status: 400,
      body: "Duplicate patch 1.21.4/first.patch in legacy data payload.",
    });

    const empty = await api("/import-legacy-data", json(exportPayload([])));
    expect(empty.status).toBe(400);

    const futureTimestamp = await api(
      "/import-legacy-data",
      json(exportPayload([exportPatch({ updatedAt: Date.now() + 60_000 })])),
    );
    expect({ status: futureTimestamp.status, body: await futureTimestamp.text() }).toEqual({
      status: 400,
      body: "Patch 1.21.4/first.patch has a future updatedAt timestamp.",
    });

    const payload = exportPayload([
      exportPatch({ status: "AVAILABLE", responsibleUser: null, duration: null }),
      exportPatch({
        path: "second.patch",
        status: "WIP",
        duration: 1_000,
        updatedAt: 1_700_000_003_000,
      }),
    ]);
    const imported = await api("/import-legacy-data", json(payload));
    expect({ status: imported.status, body: await imported.text() }).toEqual({
      status: 204,
      body: "",
    });
    expect(await (await api("/patches?minecraftVersion=1.21.4", { headers: access() })).json()).toMatchObject([
      { path: "first.patch", status: "AVAILABLE", responsibleUser: null, duration: null },
      { path: "second.patch", status: "WIP", responsibleUser: "old-alice", duration: 1_000 },
    ]);

    expect((await api("/import-legacy-data", json(payload, "bob"))).status).toBe(409);
  });

  it("rejects legacy users whose usernames have leading or trailing whitespace", async () => {
    const response = await api(
      "/import-legacy-data",
      json(exportPayload([exportPatch()], [{ username: " old-alice ", passwordHash: hashSync("old-password", 4) }])),
    );
    expect(response.status).toBe(400);
  });

  it("rejects patch records with impossible lifecycle fields", async () => {
    const invalidPatches = [
      exportPatch({ status: "AVAILABLE", responsibleUser: "alice", duration: null }),
      exportPatch({ status: "AVAILABLE", responsibleUser: null, duration: 1_000 }),
      exportPatch({ status: "WIP", responsibleUser: null, duration: null }),
      exportPatch({ status: "DONE", responsibleUser: null, duration: 1_000 }),
      exportPatch({ status: "DONE", responsibleUser: "alice", duration: null }),
    ];

    for (const patch of invalidPatches)
      expect((await api("/import-legacy-data", json(exportPayload([patch])))).status).toBe(400);
  });

  it("rejects cross-site unsafe browser requests but permits CLI-style requests without Origin", async () => {
    await initPatches(["origin.patch"]);
    const crossSite = await api("/patches/clear", {
      method: "POST",
      headers: {
        ...access(),
        Origin: "https://attacker.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ minecraftVersion: "1.21.4" }),
    });
    expect(crossSite.status).toBe(403);

    const cliStyle = await api("/patches/clear", {
      method: "POST",
      headers: {
        "Cf-Access-Jwt-Assertion": access()["Cf-Access-Jwt-Assertion"],
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ minecraftVersion: "1.21.4" }),
    });
    expect(cliStyle.status).toBe(204);
  });
});
