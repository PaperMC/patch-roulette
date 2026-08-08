package io.papermc.patchroulette.model;

import java.time.Duration;
import java.time.Instant;

/**
 * Lifecycle state of a patch. Each state carries the data that is only valid in
 * that state, so invalid combinations (e.g. a WIP patch without a responsible
 * user) are unrepresentable.
 */
public sealed interface PatchState {

  /** The status label exposed by the API. */
  String label();

  record Available() implements PatchState {
    @Override
    public String label() {
      return "AVAILABLE";
    }
  }

  record InProgress(String responsibleUser, Instant startedAt) implements PatchState {
    @Override
    public String label() {
      return "WIP";
    }
  }

  record Completed(String responsibleUser, Duration duration) implements PatchState {
    @Override
    public String label() {
      return "DONE";
    }
  }
}
