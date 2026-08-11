package com.befocus.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.befocus.entity.FocusInterruption;

public interface FocusInterruptionRepository extends JpaRepository<FocusInterruption, UUID> {
    List<FocusInterruption> findAllByFocusSessionIdOrderByOccurredAtAsc(UUID sessionId);
    long countByFocusSessionIdIn(List<UUID> sessionIds);
}
