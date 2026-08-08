package io.papermc.patchroulette.repository;

import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.StateType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PatchRepository extends JpaRepository<PatchEntity, PatchId> {
  @Transactional(readOnly = true)
  List<PatchEntity> getPatchesByStateTypeAndMinecraftVersion(
      StateType stateType, String minecraftVersion);

  @Transactional(readOnly = true)
  List<PatchEntity> getPatchesByMinecraftVersion(String minecraftVersion);

  @Transactional
  void deleteAllByMinecraftVersion(String minecraftVersion);

  @Transactional(readOnly = true)
  @Query("SELECT p.minecraftVersion FROM PatchEntity p GROUP BY p.minecraftVersion ORDER BY"
      + " MAX(p.lastUpdated)")
  List<String> getMinecraftVersions();
}
