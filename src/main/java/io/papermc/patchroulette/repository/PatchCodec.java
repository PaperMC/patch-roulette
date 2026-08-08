package io.papermc.patchroulette.repository;

import io.papermc.patchroulette.model.Patch;
import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.PatchState;
import io.papermc.patchroulette.model.StateType;
import java.util.Objects;

/** Converts between the domain {@link Patch} and the JPA {@link PatchEntity}. */
public final class PatchCodec {
  private PatchCodec() {}

  public static Patch toDomain(final PatchEntity entity) {
    return new Patch(
        new PatchId(entity.getMinecraftVersion(), entity.getPath()),
        switch (entity.getStateType()) {
          case AVAILABLE -> new PatchState.Available();
          case WIP ->
            new PatchState.InProgress(
                Objects.requireNonNull(
                    entity.getResponsibleUser(), "WIP patch missing responsible user"),
                Objects.requireNonNull(entity.getStartedAt(), "WIP patch missing start time"));
          case DONE ->
            new PatchState.Completed(
                Objects.requireNonNull(
                    entity.getResponsibleUser(), "DONE patch missing responsible user"),
                Objects.requireNonNull(entity.getDuration(), "DONE patch missing duration"));
        },
        entity.getLastUpdated());
  }

  public static PatchEntity toEntity(final Patch patch) {
    final PatchEntity entity = new PatchEntity();
    entity.setMinecraftVersion(patch.id().getMinecraftVersion());
    entity.setPath(patch.id().getPath());
    switch (patch.state()) {
      case PatchState.Available a -> {
        entity.setStateType(StateType.AVAILABLE);
        entity.setResponsibleUser(null);
        entity.setStartedAt(null);
        entity.setDuration(null);
      }
      case PatchState.InProgress w -> {
        entity.setStateType(StateType.WIP);
        entity.setResponsibleUser(w.responsibleUser());
        entity.setStartedAt(w.startedAt());
        entity.setDuration(null);
      }
      case PatchState.Completed c -> {
        entity.setStateType(StateType.DONE);
        entity.setResponsibleUser(c.responsibleUser());
        entity.setStartedAt(null);
        entity.setDuration(c.duration());
      }
    }
    entity.setLastUpdated(patch.lastUpdated());
    return entity;
  }
}
