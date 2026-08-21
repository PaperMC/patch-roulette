import { type UserProfile } from "../domain";
import { type PatchRoulette } from "./patch-roulette";

export interface Principal {
  user: UserProfile;
}

export interface Env {
  PATCH_ROULETTE: DurableObjectNamespace<PatchRoulette>;
  ASSETS: Fetcher;
}
