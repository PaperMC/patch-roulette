package io.papermc.patchroulette.model;

/** Discriminator for {@link PatchState}, stored in the state_type column. */
public enum StateType {
  AVAILABLE,
  WIP,
  DONE,
}
