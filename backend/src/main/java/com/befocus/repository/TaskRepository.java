package com.befocus.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.befocus.entity.Task;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findAllByUserIdOrderByStatusAscDueDateAscCreatedAtAsc(UUID userId);
    List<Task> findAllByUserIdAndProjectIdOrderByStatusAscDueDateAscCreatedAtAsc(UUID userId, UUID projectId);
    List<Task> findAllByUserIdAndDueDateOrderByStatusAscCreatedAtAsc(UUID userId, LocalDate dueDate);
    Optional<Task> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndStatus(UUID userId, com.befocus.entity.TaskStatus status);
    long countByUserIdAndDueDateAndStatus(UUID userId, LocalDate dueDate, com.befocus.entity.TaskStatus status);
    long countByUserIdAndProjectIdAndStatus(UUID userId, UUID projectId, com.befocus.entity.TaskStatus status);
}
