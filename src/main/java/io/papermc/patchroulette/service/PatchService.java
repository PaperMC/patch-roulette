package io.papermc.patchroulette.service;

import io.papermc.patchroulette.model.Patch;
import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.Status;
import io.papermc.patchroulette.repository.PatchRepository;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static io.papermc.patchroulette.controller.RESTController.PatchInfo;

@Service
public class PatchService {

    private final PatchRepository patchRepository;

    @Autowired
    public PatchService(final PatchRepository patchRepository) {
        this.patchRepository = patchRepository;
    }

    @Transactional
    public void setPatches(final String minecraftVersion, final List<PatchInfo> patchInfos) {
        final List<Patch> patches = patchInfos.stream().map(patchInfo -> {
            final Patch patch = new Patch();
            patch.setPath(patchInfo.path());
            patch.setSize(patchInfo.size());
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
    public List<String> startWorkOnPatches(final String minecraftVersion, final List<String> patches, final String user) {
        final List<String> startedPatches = new ArrayList<>();
        for (final String path : patches) {
            final PatchId patchId = new PatchId(minecraftVersion, path);
            final Patch patch = this.patchRepository.getReferenceById(patchId);
            if (patch.getStatus() != Status.AVAILABLE) {
                continue;
            }
            if (patch.getResponsibleUser() != null) {
                continue;
            }
            patch.setStatus(Status.WIP);
            patch.setResponsibleUser(user);
            this.patchRepository.save(patch);
            startedPatches.add(path);
        }
        return startedPatches;
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
    public void finishWorkOnPatch(final PatchId patchId, final String user) {
        final Patch patch = this.patchRepository.getReferenceById(patchId);
        if (patch.getStatus() != Status.WIP) {
            throw new IllegalStateException("Patch " + patchId + " is not WIP");
        }
        if (!patch.getResponsibleUser().equals(user)) {
            throw new IllegalStateException("User " + user + " is not responsible for patch " + patchId);
        }
        patch.setStatus(Status.DONE);
        this.patchRepository.save(patch);
    }

    @Transactional
    public void undoPatch(final PatchId patchId, final String user) {
        final Patch patch = this.patchRepository.getReferenceById(patchId);
        if (patch.getStatus() != Status.DONE) {
            throw new IllegalStateException("Patch " + patchId + " is not DONE");
        }
        patch.setStatus(Status.WIP);
        patch.setResponsibleUser(user);
        this.patchRepository.save(patch);
    }

    public void clearPatches(final String minecraftVersion) {
        this.patchRepository.deleteAllByMinecraftVersion(minecraftVersion);
    }
}
