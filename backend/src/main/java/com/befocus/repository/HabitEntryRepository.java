package com.befocus.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.befocus.entity.HabitEntry;

public interface HabitEntryRepository extends JpaRepository<HabitEntry, UUID> {
    Optional<HabitEntry> findByHabitIdAndDate(UUID habitId, LocalDate date);
    List<HabitEntry> findAllByHabitIdAndDateBetweenOrderByDateAsc(UUID habitId, LocalDate from, LocalDate to);
    List<HabitEntry> findAllByHabitIdAndDateBetween(UUID habitId, LocalDate from, LocalDate to);
}
