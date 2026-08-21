import * as v from "valibot";

export const nonEmptyString = v.pipe(v.string(), v.nonEmpty());
export const minecraftVersionSchema = nonEmptyString;
export const epochMilliseconds = v.pipe(
  v.number(),
  v.safeInteger(),
  v.minValue(-8_640_000_000_000_000),
  v.maxValue(8_640_000_000_000_000),
);
