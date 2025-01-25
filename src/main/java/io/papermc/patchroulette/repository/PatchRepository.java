package io.papermc.patchroulette.repository;

import io.papermc.patchroulette.model.Patch;
import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.Status;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PatchRepository extends JpaRepository<Patch, PatchId> {
    @Transactional(readOnly = true)
    List<Patch> getPatchesByStatusAndMinecraftVersion(Status status, String minecraftVersion);

    @Transactional(readOnly = true)
    List<Patch> getPatchesByMinecraftVersion(String minecraftVersion);
}
