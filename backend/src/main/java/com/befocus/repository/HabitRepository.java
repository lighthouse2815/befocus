package com.befocus.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.befocus.entity.Habit;

public interface HabitRepository extends JpaRepository<Habit, UUID> {
    List<Habit> findAllByUserIdAndArchivedAtIsNullOrderByCreatedAtAsc(UUID userId);
    List<Habit> findAllByUserIdAndArchivedAtIsNotNullOrderByArchivedAtDesc(UUID userId);
    Optional<Habit> findByIdAndUserId(UUID id, UUID userId);
}
