package com.befocus.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.befocus.entity.FocusSession;
import com.befocus.entity.FocusStatus;

public interface FocusSessionRepository extends JpaRepository<FocusSession, UUID> {
    Optional<FocusSession> findByIdAndUserId(UUID id, UUID userId);

    @Query("select s from FocusSession s where s.user.id = :userId and s.status in :statuses order by s.createdAt desc")
    List<FocusSession> findActiveByUser(UUID userId, List<FocusStatus> statuses);

    List<FocusSession> findAllByUserIdAndStatusAndCompletedAtBetweenOrderByCompletedAtAsc(UUID userId, FocusStatus status,
            Instant from, Instant to);

    List<FocusSession> findAllByUserIdAndStatusAndCompletedAtBetween(UUID userId, FocusStatus status, Instant from,
            Instant to);

    List<FocusSession> findAllByUserIdAndProjectIdAndStatusAndCompletedAtBetween(UUID userId, UUID projectId,
            FocusStatus status, Instant from, Instant to);

    List<FocusSession> findAllByUserIdAndTaskIdAndStatusAndCompletedAtBetween(UUID userId, UUID taskId,
            FocusStatus status, Instant from, Instant to);

    List<FocusSession> findAllByUserIdAndHabitIdAndStatusAndCompletedAtBetween(UUID userId, UUID habitId,
            FocusStatus status, Instant from, Instant to);

    List<FocusSession> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);
}
