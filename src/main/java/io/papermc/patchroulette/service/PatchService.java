package io.papermc.patchroulette.service;

import io.papermc.patchroulette.model.Patch;
import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.PatchRouletteUser;
import io.papermc.patchroulette.model.Status;
import io.papermc.patchroulette.repository.PatchRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PatchService {

    private final PatchRepository patchRepository;

    public PatchService(final PatchRepository patchRepository) {
        this.patchRepository = patchRepository;
    }

    @Transactional
    public void setPatches(final String minecraftVersion, final List<String> paths) {
        final List<Patch> patches = paths.stream().map(path -> {
            final Patch patch = new Patch();
            patch.setPath(path);
            patch.setStatus(Status.AVAILABLE);
            patch.setMinecraftVersion(minecraftVersion);
            return patch;
        }).toList();

        this.patchRepository.saveAll(patches);
    }

    public List<Patch> getAvailablePatches(final String minecraftVersion) {
        return this.patchRepository.getPatchesByStatusAndMinecraftVersion(Status.AVAILABLE, minecraftVersion);
    }

    public List<Patch> getAllPatches(final String minecraftVersion) {
        return this.patchRepository.getPatchesByMinecraftVersion(minecraftVersion);
    }

    @Transactional
    public void startWorkOnPatch(final PatchId patchId, final PatchRouletteUser user) {
        final Patch patch = this.patchRepository.getReferenceById(patchId);
        if (patch.getStatus() != Status.AVAILABLE) {
            throw new IllegalStateException("Patch " + patchId + " is not available");
        }
        if (patch.getResponsibleUser() != null) {
            throw new IllegalStateException("Patch " + patchId + " is already claimed by another user");
        }
        patch.setStatus(Status.WIP);
        patch.setResponsibleUser(user);
        this.patchRepository.save(patch);
    }

    @Transactional
    public void cancelWorkOnPatch(final PatchId patchId) {
        final Patch patch = this.patchRepository.getReferenceById(patchId);
        if (patch.getStatus() != Status.WIP) {
            throw new IllegalStateException("Patch " + patchId + " is not WIP");
        }
        patch.setStatus(Status.AVAILABLE);
        patch.setResponsibleUser(null);
        this.patchRepository.save(patch);
    }

    @Transactional
    public void finishWorkOnPatch(final PatchId patchId, final PatchRouletteUser user) {
        final Patch patch = this.patchRepository.getReferenceById(patchId);
        if (patch.getStatus() != Status.WIP) {
            throw new IllegalStateException("Patch " + patchId + " is not WIP");
        }
        if (patch.getResponsibleUser().getUserId() != user.getUserId()) {
            throw new IllegalStateException("User " + user.getUsername() + " is not responsible for patch " + patchId);
        }
        patch.setStatus(Status.DONE);
        this.patchRepository.save(patch);
    }
}
