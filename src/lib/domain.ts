import * as v from "valibot";
import { epochMilliseconds, minecraftVersionSchema, nonEmptyString } from "./schemas";

export const PATCH_STATUSES = ["AVAILABLE", "WIP", "DONE"] as const;

export const usernameSchema = v.pipe(nonEmptyString, v.maxLength(64));
const nonNegativeInteger = v.pipe(v.number(), v.safeInteger(), v.minValue(0));

export const patchStatusSchema = v.picklist(PATCH_STATUSES);
export type PatchStatus = v.InferOutput<typeof patchStatusSchema>;

const patchFields = {
  minecraftVersion: minecraftVersionSchema,
  path: nonEmptyString,
  updatedAt: epochMilliseconds,
};

export const patchSchema = v.variant("status", [
  v.strictObject({
    ...patchFields,
    status: v.literal("AVAILABLE"),
    responsibleUser: v.null(),
    duration: v.null(),
  }),
  v.strictObject({
    ...patchFields,
    status: v.literal("WIP"),
    responsibleUser: nonEmptyString,
    duration: v.nullable(nonNegativeInteger),
  }),
  v.strictObject({
    ...patchFields,
    status: v.literal("DONE"),
    responsibleUser: nonEmptyString,
    duration: nonNegativeInteger,
  }),
]);
export type Patch = v.InferOutput<typeof patchSchema>;

export const userProfileSchema = v.strictObject({ id: nonEmptyString, username: usernameSchema });
export type UserProfile = v.InferOutput<typeof userProfileSchema>;

export const leaderboardEntrySchema = v.strictObject({
  userId: nonEmptyString,
  rank: nonNegativeInteger,
  username: nonEmptyString,
  wip: nonNegativeInteger,
  done: nonNegativeInteger,
  timeSpent: nonNegativeInteger,
});
export type LeaderboardEntry = v.InferOutput<typeof leaderboardEntrySchema>;

export const statsSchema = v.strictObject({
  total: nonNegativeInteger,
  available: nonNegativeInteger,
  wip: nonNegativeInteger,
  done: nonNegativeInteger,
  leaderboard: v.array(leaderboardEntrySchema),
  timeSpent: nonNegativeInteger,
});
export type Stats = v.InferOutput<typeof statsSchema>;
