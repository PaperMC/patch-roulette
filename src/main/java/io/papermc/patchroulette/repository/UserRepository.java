package io.papermc.patchroulette.repository;

import io.papermc.patchroulette.model.PatchRouletteUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<PatchRouletteUser, Long> {
    Optional<PatchRouletteUser> findOneByUsername(String username);

    Optional<PatchRouletteUser> findOneByToken(String token);
}
