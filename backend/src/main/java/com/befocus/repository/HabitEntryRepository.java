package com.befocus.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;

import com.befocus.entity.HabitEntry;

public interface HabitEntryRepository extends JpaRepository<HabitEntry, UUID> {
    Optional<HabitEntry> findByHabitIdAndDate(UUID habitId, LocalDate date);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from HabitEntry e where e.habit.id = :habitId and e.date = :date")
    Optional<HabitEntry> findByHabitIdAndDateForUpdate(UUID habitId, LocalDate date);
    List<HabitEntry> findAllByHabitIdAndDateBetweenOrderByDateAsc(UUID habitId, LocalDate from, LocalDate to);
    List<HabitEntry> findAllByHabitIdAndDateBetween(UUID habitId, LocalDate from, LocalDate to);
    List<HabitEntry> findAllByHabitIdOrderByDateAsc(UUID habitId);
    List<HabitEntry> findAllByHabitIdInOrderByDateAsc(List<UUID> habitIds);
}
