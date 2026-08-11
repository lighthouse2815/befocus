package com.befocus.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import com.befocus.entity.FocusSession;
import com.befocus.entity.FocusStatus;

import jakarta.persistence.LockModeType;

public interface FocusSessionRepository extends JpaRepository<FocusSession, UUID> {
    interface ProjectFocusMinutes {
        UUID getProjectId();
        long getMinutes();
    }

    interface TaskFocusMinutes {
        UUID getTaskId();
        long getMinutes();
    }

    Optional<FocusSession> findByIdAndUserId(UUID id, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from FocusSession s where s.id = :id and s.user.id = :userId")
    Optional<FocusSession> findByIdAndUserIdForUpdate(UUID id, UUID userId);

    @Query("select s from FocusSession s where s.user.id = :userId and s.status in :statuses order by s.createdAt desc")
    List<FocusSession> findActiveByUser(UUID userId, List<FocusStatus> statuses);

    List<FocusSession> findAllByUserIdAndStatusAndCompletedAtBetweenOrderByCompletedAtAsc(UUID userId, FocusStatus status,
            Instant from, Instant to);

    List<FocusSession> findAllByUserIdAndStatusAndCompletedAtBetween(UUID userId, FocusStatus status, Instant from,
            Instant to);

    List<FocusSession> findAllByUserIdAndStatusAndCancelledAtBetween(UUID userId, FocusStatus status, Instant from,
            Instant to);

    List<FocusSession> findAllByUserIdAndProjectIdAndStatusAndCompletedAtBetween(UUID userId, UUID projectId,
            FocusStatus status, Instant from, Instant to);

    List<FocusSession> findAllByUserIdAndProjectIdAndStatusOrderByCompletedAtDesc(UUID userId, UUID projectId,
            FocusStatus status);

    List<FocusSession> findTop10ByUserIdAndProjectIdOrderByCreatedAtDesc(UUID userId, UUID projectId);

    List<FocusSession> findAllByUserIdAndTaskIdAndStatusAndCompletedAtBetween(UUID userId, UUID taskId,
            FocusStatus status, Instant from, Instant to);

    List<FocusSession> findAllByUserIdAndTaskIdAndStatusOrderByCompletedAtDesc(UUID userId, UUID taskId,
            FocusStatus status);

    List<FocusSession> findAllByUserIdAndHabitIdAndStatusAndCompletedAtBetween(UUID userId, UUID habitId,
            FocusStatus status, Instant from, Instant to);

    List<FocusSession> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);

    List<FocusSession> findAllByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("select s.project.id as projectId, coalesce(sum(s.actualDurationMinutes), 0) as minutes "
            + "from FocusSession s where s.user.id = :userId and s.status = :status and s.project.id in :projectIds "
            + "group by s.project.id")
    List<ProjectFocusMinutes> sumMinutesByProjectIds(UUID userId, FocusStatus status, List<UUID> projectIds);

    @Query("select s.task.id as taskId, coalesce(sum(s.actualDurationMinutes), 0) as minutes "
            + "from FocusSession s where s.user.id = :userId and s.status = :status and s.task.id in :taskIds "
            + "group by s.task.id")
    List<TaskFocusMinutes> sumMinutesByTaskIds(UUID userId, FocusStatus status, List<UUID> taskIds);
}
