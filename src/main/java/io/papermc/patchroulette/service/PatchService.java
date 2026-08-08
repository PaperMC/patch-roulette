package io.papermc.patchroulette.service;

import io.papermc.patchroulette.model.Patch;
import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.PatchState;
import io.papermc.patchroulette.model.StateType;
import io.papermc.patchroulette.repository.PatchCodec;
import io.papermc.patchroulette.repository.PatchEntity;
import io.papermc.patchroulette.repository.PatchRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PatchService {

  private final PatchRepository patchRepository;

  @Autowired
  public PatchService(final PatchRepository patchRepository) {
    this.patchRepository = patchRepository;
  }

  private Patch loadPatch(final PatchId patchId) {
    return PatchCodec.toDomain(
        this.patchRepository.findById(patchId).orElseThrow(EntityNotFoundException::new));
  }

  @Transactional
  public void setPatches(final String minecraftVersion, final List<String> paths) {
    final List<PatchEntity> entities = paths.stream()
        .map(path -> PatchCodec.toEntity(new Patch(
            new PatchId(minecraftVersion, path), new PatchState.Available(), Instant.now())))
        .toList();

    this.patchRepository.saveAll(entities);
  }

  public List<Patch> getAvailablePatches(final String minecraftVersion) {
    return this.patchRepository
        .getPatchesByStateTypeAndMinecraftVersion(StateType.AVAILABLE, minecraftVersion)
        .stream()
        .map(PatchCodec::toDomain)
        .toList();
  }

  public List<Patch> getAllPatches(final String minecraftVersion) {
    return this.patchRepository.getPatchesByMinecraftVersion(minecraftVersion).stream()
        .map(PatchCodec::toDomain)
        .toList();
  }

  @Transactional
  public List<String> startWorkOnPatches(
      final String minecraftVersion, final List<String> patches, final String user) {
    final List<String> startedPatches = new ArrayList<>();
    for (final String path : patches) {
      final PatchId patchId = new PatchId(minecraftVersion, path);
      final Patch patch = this.loadPatch(patchId);
      if (!(patch.state() instanceof PatchState.Available)) {
        continue;
      }
      final Patch started =
          new Patch(patchId, new PatchState.InProgress(user, Instant.now()), Instant.now());
      this.patchRepository.save(PatchCodec.toEntity(started));
      startedPatches.add(path);
    }
    return startedPatches;
  }

  @Transactional
  public void cancelWorkOnPatch(final PatchId patchId) {
    final Patch patch = this.loadPatch(patchId);
    if (!(patch.state() instanceof PatchState.InProgress)
        && !(patch.state() instanceof PatchState.Completed)) {
      throw new IllegalStateException("Patch " + patchId + " is not WIP");
    }
    final Patch cancelled = new Patch(patchId, new PatchState.Available(), Instant.now());
    this.patchRepository.save(PatchCodec.toEntity(cancelled));
  }

  @Transactional
  public void finishWorkOnPatch(final PatchId patchId, final String user) {
    final Patch patch = this.loadPatch(patchId);
    final Patch finished = new Patch(
        patchId,
        switch (patch.state()) {
          case PatchState.Available a ->
            throw new IllegalStateException("Patch " + patchId + " is not WIP");
          case PatchState.InProgress w -> {
            if (!w.responsibleUser().equals(user)) {
              throw new IllegalStateException(
                  "User " + user + " is not responsible for patch " + patchId);
            }
            yield new PatchState.Completed(user, Duration.between(w.startedAt(), Instant.now()));
          }
          case PatchState.Completed c ->
            throw new IllegalStateException("Patch " + patchId + " is not WIP");
        },
        Instant.now());
    this.patchRepository.save(PatchCodec.toEntity(finished));
  }

  @Transactional
  public void undoPatch(final PatchId patchId, final String user) {
    final Patch patch = this.loadPatch(patchId);
    if (!(patch.state() instanceof PatchState.Completed)) {
      throw new IllegalStateException("Patch " + patchId + " is not DONE");
    }
    final Patch undone =
        new Patch(patchId, new PatchState.InProgress(user, Instant.now()), Instant.now());
    this.patchRepository.save(PatchCodec.toEntity(undone));
  }

  public void clearPatches(final String minecraftVersion) {
    this.patchRepository.deleteAllByMinecraftVersion(minecraftVersion);
  }

  public List<String> getMinecraftVersions() {
    return this.patchRepository.getMinecraftVersions();
  }
}
