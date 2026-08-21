import { DurableObject } from "cloudflare:workers";
import { compare } from "bcryptjs";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import * as v from "valibot";
import { patchSchema, type Patch, type Stats } from "../domain";
import { identities, legacyCredentials, patches, users } from "../db/schema";
import migrations from "../db/migrations/migrations";
import { generateFriendlyName } from "../friendly-name";
import { type ExternalIdentity } from "./auth";
import { type Env } from "./types";

export type PatchActionResult =
  | { status: "ok"; patch: Patch }
  | { status: "missing" }
  | { status: "conflict"; message: string };
type StartResult =
  | { status: "ok"; patches: Patch[] }
  | { status: "missing"; path: string }
  | { status: "conflict"; message: string };
type LegacyUserImport = { username: string; passwordHash: string };

export const patchDescription = (minecraftVersion: string, path: string) => `Patch ${minecraftVersion}/${path}`;

export class PatchRoulette extends DurableObject {
  private readonly db;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.db = drizzle(ctx.storage);
    void ctx.blockConcurrencyWhile(async () => {
      migrate(this.db, migrations);
    });
  }

  async available(minecraftVersion: string): Promise<string[]> {
    return this.db
      .select({ path: patches.path })
      .from(patches)
      .where(and(eq(patches.minecraftVersion, minecraftVersion), eq(patches.status, "AVAILABLE")))
      .orderBy(asc(patches.path))
      .all()
      .map((patch) => patch.path);
  }

  async all(minecraftVersion: string): Promise<Patch[]> {
    const records = this.db
      .select({
        minecraftVersion: patches.minecraftVersion,
        path: patches.path,
        status: patches.status,
        responsibleUser: users.username,
        updatedAt: patches.updatedAt,
        duration: patches.duration,
      })
      .from(patches)
      .leftJoin(users, eq(patches.responsibleUserId, users.id))
      .where(eq(patches.minecraftVersion, minecraftVersion))
      .orderBy(asc(patches.path))
      .all();
    return v.parse(v.array(patchSchema), records);
  }

  async init(minecraftVersion: string, paths: string[]): Promise<boolean> {
    let initialized = false;
    this.db.transaction((tx) => {
      if (
        tx
          .select({ path: patches.path })
          .from(patches)
          .where(eq(patches.minecraftVersion, minecraftVersion))
          .limit(1)
          .get()
      )
        return;

      const timestamp = Date.now();
      for (const path of new Set(paths))
        tx.insert(patches).values({ minecraftVersion, path, status: "AVAILABLE", updatedAt: timestamp }).run();
      initialized = true;
    });
    return initialized;
  }

  async clear(minecraftVersion: string): Promise<void> {
    this.db.delete(patches).where(eq(patches.minecraftVersion, minecraftVersion)).run();
  }

  async start(minecraftVersion: string, paths: string[], userId: string): Promise<StartResult> {
    const existing = this.db
      .select({ path: patches.path })
      .from(patches)
      .where(eq(patches.minecraftVersion, minecraftVersion))
      .all();
    const known = new Set(existing.map((patch) => patch.path));
    const missingPath = paths.find((path) => !known.has(path));
    if (missingPath) return { status: "missing", path: missingPath };

    const timestamp = Date.now();
    const claimed: string[] = [];
    this.db.transaction((tx) => {
      for (const path of paths) {
        const patch = tx
          .select({ status: patches.status })
          .from(patches)
          .where(and(eq(patches.minecraftVersion, minecraftVersion), eq(patches.path, path)))
          .get();
        if (patch?.status !== "AVAILABLE") continue;
        tx.update(patches)
          .set({ status: "WIP", responsibleUserId: userId, updatedAt: timestamp })
          .where(and(eq(patches.minecraftVersion, minecraftVersion), eq(patches.path, path)))
          .run();
        claimed.push(path);
      }
    });
    if (!claimed.length) return { status: "conflict", message: "None of the requested patches are available." };
    return { status: "ok", patches: this.patchesForPaths(minecraftVersion, claimed) };
  }

  async complete(minecraftVersion: string, path: string, userId: string): Promise<PatchActionResult> {
    const patch = this.getPatch(minecraftVersion, path);
    if (!patch) return { status: "missing" };
    if (patch.status !== "WIP")
      return {
        status: "conflict",
        message: `${patchDescription(minecraftVersion, path)} is not WIP.`,
      };
    if (patch.responsibleUserId !== userId)
      return {
        status: "conflict",
        message: `You are not responsible for ${patchDescription(minecraftVersion, path)}.`,
      };

    const timestamp = Date.now();
    this.db
      .update(patches)
      .set({
        status: "DONE",
        duration: (patch.duration ?? 0) + timestamp - patch.updatedAt,
        updatedAt: timestamp,
      })
      .where(and(eq(patches.minecraftVersion, minecraftVersion), eq(patches.path, path)))
      .run();
    return { status: "ok", patch: this.patchForPath(minecraftVersion, path) };
  }

  async cancel(minecraftVersion: string, path: string): Promise<PatchActionResult> {
    const patch = this.getPatch(minecraftVersion, path);
    if (!patch) return { status: "missing" };
    if (patch.status !== "WIP" && patch.status !== "DONE")
      return {
        status: "conflict",
        message: `${patchDescription(minecraftVersion, path)} is not WIP or DONE.`,
      };

    this.db
      .update(patches)
      .set({ status: "AVAILABLE", responsibleUserId: null, duration: null, updatedAt: Date.now() })
      .where(and(eq(patches.minecraftVersion, minecraftVersion), eq(patches.path, path)))
      .run();
    return { status: "ok", patch: this.patchForPath(minecraftVersion, path) };
  }

  async undo(minecraftVersion: string, path: string, userId: string): Promise<PatchActionResult> {
    const patch = this.getPatch(minecraftVersion, path);
    if (!patch) return { status: "missing" };
    if (patch.status !== "DONE")
      return {
        status: "conflict",
        message: `${patchDescription(minecraftVersion, path)} is not DONE.`,
      };

    this.db
      .update(patches)
      .set({ status: "WIP", responsibleUserId: userId, updatedAt: Date.now() })
      .where(and(eq(patches.minecraftVersion, minecraftVersion), eq(patches.path, path)))
      .run();
    return { status: "ok", patch: this.patchForPath(minecraftVersion, path) };
  }

  async versions(): Promise<string[]> {
    return this.db
      .select({ minecraftVersion: patches.minecraftVersion })
      .from(patches)
      .groupBy(patches.minecraftVersion)
      .orderBy(asc(max(patches.updatedAt)))
      .all()
      .map((row) => row.minecraftVersion);
  }

  async stats(minecraftVersion: string): Promise<Stats> {
    const all = this.db
      .select({
        status: patches.status,
        responsibleUserId: patches.responsibleUserId,
        responsibleUser: users.username,
        updatedAt: patches.updatedAt,
        duration: patches.duration,
      })
      .from(patches)
      .leftJoin(users, eq(patches.responsibleUserId, users.id))
      .where(eq(patches.minecraftVersion, minecraftVersion))
      .orderBy(asc(patches.path))
      .all();
    const leaderboard = new Map<
      string,
      { userId: string; username: string; wip: number; done: number; intervals: [number, number][] }
    >();
    for (const patch of all)
      if (patch.responsibleUser && patch.responsibleUserId) {
        const user = leaderboard.get(patch.responsibleUserId) ?? {
          userId: patch.responsibleUserId,
          username: patch.responsibleUser,
          wip: 0,
          done: 0,
          intervals: [],
        };
        if (patch.status === "WIP") user.wip++;
        if (patch.status === "DONE") user.done++;
        // A patch's time is a single scalar owned by its current responsibleUserId, so
        // all accumulated time (including any earned under a previous owner) is credited
        // to whoever owns the patch now; undo/redo cycles don't split it per user.
        if (patch.duration !== null) user.intervals.push([patch.updatedAt - patch.duration, patch.updatedAt]);
        leaderboard.set(patch.responsibleUserId, user);
      }

    let totalTime = 0;
    const ranked = [...leaderboard.values()]
      .map((user) => {
        const intervals = user.intervals.sort((a, b) => a[0] - b[0]);
        let time = 0;
        let end = -Infinity;
        for (const [start, finish] of intervals) {
          time += Math.max(0, finish - Math.max(start, end));
          end = Math.max(end, finish);
        }
        totalTime += time;
        return { ...user, rank: 0, timeSpent: time };
      })
      .sort((a, b) => b.done - a.done || b.wip - a.wip || a.username.localeCompare(b.username));
    let rank = 0;
    ranked.forEach((user, index) => {
      if (!index || user.done !== ranked[index - 1].done || user.wip !== ranked[index - 1].wip) rank = index + 1;
      user.rank = rank;
    });

    return {
      total: all.length,
      available: all.filter((patch) => patch.status === "AVAILABLE").length,
      wip: all.filter((patch) => patch.status === "WIP").length,
      done: all.filter((patch) => patch.status === "DONE").length,
      leaderboard: ranked.map((user) => ({
        userId: user.userId,
        rank: user.rank,
        username: user.username,
        wip: user.wip,
        done: user.done,
        timeSpent: user.timeSpent,
      })),
      timeSpent: totalTime,
    };
  }

  async importLegacyData(records: Patch[], legacyUsers: LegacyUserImport[]): Promise<boolean> {
    if (!this.isEmpty()) return false;

    this.db.transaction((tx) => {
      const legacyUserIds = new Map<string, string>();
      for (const legacyUser of legacyUsers) {
        const userId = crypto.randomUUID();
        const timestamp = Date.now();
        tx.insert(users)
          .values({
            id: userId,
            username: legacyUser.username,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .run();
        tx.insert(legacyCredentials)
          .values({
            username: legacyUser.username,
            userId,
            passwordHash: legacyUser.passwordHash,
            disabledAt: null,
          })
          .run();
        legacyUserIds.set(legacyUser.username, userId);
      }

      for (const { responsibleUser, ...record } of records) {
        let responsibleUserId: string | null = null;
        if (responsibleUser !== null) {
          responsibleUserId = legacyUserIds.get(responsibleUser) ?? null;
          if (!responsibleUserId) {
            responsibleUserId = crypto.randomUUID();
            const timestamp = Date.now();
            tx.insert(users)
              .values({
                id: responsibleUserId,
                username: responsibleUser,
                createdAt: timestamp,
                updatedAt: timestamp,
              })
              .run();
            legacyUserIds.set(responsibleUser, responsibleUserId);
          }
        }
        tx.insert(patches)
          .values({ ...record, responsibleUserId })
          .run();
      }
    });
    return true;
  }

  async claimLegacyUser(currentUserId: string, username: string, password: string) {
    const credential = this.db.select().from(legacyCredentials).where(eq(legacyCredentials.username, username)).get();
    if (!credential?.passwordHash || credential.disabledAt !== null) return false;
    const passwordHash = credential.passwordHash;
    if (!(await compare(password, passwordHash.replace(/^\{bcrypt\}/, "")))) return false;

    const timestamp = Date.now();
    let claimed = false;
    this.db.transaction((tx) => {
      const activeCredential = tx
        .select()
        .from(legacyCredentials)
        .where(eq(legacyCredentials.username, username))
        .get();
      const current = tx.select().from(users).where(eq(users.id, currentUserId)).get();
      if (
        !current ||
        !activeCredential?.passwordHash ||
        activeCredential.disabledAt !== null ||
        activeCredential.passwordHash !== passwordHash
      )
        return;

      tx.update(patches)
        .set({ responsibleUserId: currentUserId })
        .where(eq(patches.responsibleUserId, activeCredential.userId))
        .run();
      tx.update(legacyCredentials)
        .set({ userId: currentUserId, passwordHash: null, disabledAt: timestamp })
        .where(eq(legacyCredentials.username, username))
        .run();
      tx.delete(users).where(eq(users.id, activeCredential.userId)).run();
      claimed = true;
    });
    return claimed;
  }

  async resolveOrProvisionUser(identity: ExternalIdentity) {
    const existingIdentity = this.db
      .select()
      .from(identities)
      .where(and(eq(identities.issuer, identity.issuer), eq(identities.subject, identity.subject)))
      .get();
    if (existingIdentity) {
      const existingUser = this.db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.id, existingIdentity.userId))
        .get();
      if (existingUser) return existingUser;
    }

    const timestamp = Date.now();
    const user = {
      id: crypto.randomUUID(),
      username: generateFriendlyName(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.db.transaction((tx) => {
      tx.insert(users).values(user).run();
      tx.insert(identities)
        .values({ ...identity, userId: user.id })
        .run();
    });
    return { id: user.id, username: user.username };
  }

  async updateUsername(userId: string, username: string) {
    this.db.update(users).set({ username, updatedAt: Date.now() }).where(eq(users.id, userId)).run();
    return this.user(userId);
  }

  async user(userId: string) {
    return (
      this.db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, userId)).get() ?? null
    );
  }

  private getPatch(minecraftVersion: string, path: string) {
    return (
      this.db
        .select()
        .from(patches)
        .where(and(eq(patches.minecraftVersion, minecraftVersion), eq(patches.path, path)))
        .get() ?? null
    );
  }

  private patchForPath(minecraftVersion: string, path: string): Patch {
    const patch = this.db
      .select({
        minecraftVersion: patches.minecraftVersion,
        path: patches.path,
        status: patches.status,
        responsibleUser: users.username,
        updatedAt: patches.updatedAt,
        duration: patches.duration,
      })
      .from(patches)
      .leftJoin(users, eq(patches.responsibleUserId, users.id))
      .where(and(eq(patches.minecraftVersion, minecraftVersion), eq(patches.path, path)))
      .get();
    if (!patch) throw new Error(`${patchDescription(minecraftVersion, path)} disappeared after an update.`);
    return v.parse(patchSchema, patch);
  }

  private patchesForPaths(minecraftVersion: string, paths: string[]): Patch[] {
    const records = this.db
      .select({
        minecraftVersion: patches.minecraftVersion,
        path: patches.path,
        status: patches.status,
        responsibleUser: users.username,
        updatedAt: patches.updatedAt,
        duration: patches.duration,
      })
      .from(patches)
      .leftJoin(users, eq(patches.responsibleUserId, users.id))
      .where(and(eq(patches.minecraftVersion, minecraftVersion), inArray(patches.path, paths)))
      .orderBy(asc(patches.path))
      .all();
    return v.parse(v.array(patchSchema), records);
  }

  private isEmpty(): boolean {
    return (
      !this.db.select({ value: patches.minecraftVersion }).from(patches).limit(1).get() &&
      !this.db.select({ value: legacyCredentials.username }).from(legacyCredentials).limit(1).get()
    );
  }
}
