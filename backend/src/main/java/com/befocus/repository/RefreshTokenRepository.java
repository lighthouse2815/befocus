package com.befocus.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import com.befocus.entity.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    List<RefreshToken> findAllByFamilyIdAndRevokedAtIsNull(UUID familyId);

    @Modifying
    @Query("update RefreshToken r set r.revokedAt = CURRENT_TIMESTAMP where r.familyId = :familyId and r.revokedAt is null")
    int revokeFamily(UUID familyId);
}
