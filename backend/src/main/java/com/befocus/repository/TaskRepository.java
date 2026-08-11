package com.befocus.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.befocus.entity.Task;
import com.befocus.entity.TaskStatus;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    interface ProjectTaskCount {
        UUID getProjectId();
        TaskStatus getStatus();
        long getTotal();
    }

    List<Task> findAllByUserIdOrderByStatusAscDueDateAscCreatedAtAsc(UUID userId);
    List<Task> findAllByUserIdAndProjectIdOrderByStatusAscDueDateAscCreatedAtAsc(UUID userId, UUID projectId);
    List<Task> findAllByUserIdAndDueDateOrderByStatusAscCreatedAtAsc(UUID userId, LocalDate dueDate);
    Optional<Task> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndStatus(UUID userId, com.befocus.entity.TaskStatus status);
    long countByUserIdAndDueDateAndStatus(UUID userId, LocalDate dueDate, com.befocus.entity.TaskStatus status);
    long countByUserIdAndProjectIdAndStatus(UUID userId, UUID projectId, com.befocus.entity.TaskStatus status);

    @Query("select t.project.id as projectId, t.status as status, count(t) as total from Task t "
            + "where t.user.id = :userId and t.project.id in :projectIds group by t.project.id, t.status")
    List<ProjectTaskCount> countByProjectIds(UUID userId, List<UUID> projectIds);
}
