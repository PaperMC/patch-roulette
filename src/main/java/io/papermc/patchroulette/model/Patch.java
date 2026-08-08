package io.papermc.patchroulette.model;

import java.time.Instant;
import org.jspecify.annotations.Nullable;

/** Domain model of a patch, persisted via {@code repository.PatchEntity}. */
public record Patch(PatchId id, PatchState state, @Nullable Instant lastUpdated) {}
