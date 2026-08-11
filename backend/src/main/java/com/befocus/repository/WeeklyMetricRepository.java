package com.befocus.repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.befocus.entity.WeeklyMetric;

public interface WeeklyMetricRepository extends JpaRepository<WeeklyMetric, UUID> {
    Optional<WeeklyMetric> findByUserIdAndWeekStart(UUID userId, LocalDate weekStart);
}
