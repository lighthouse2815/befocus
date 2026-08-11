package com.befocus.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.befocus.entity.DailyMetric;

public interface DailyMetricRepository extends JpaRepository<DailyMetric, UUID> {
    Optional<DailyMetric> findByUserIdAndMetricDate(UUID userId, LocalDate date);
    List<DailyMetric> findAllByUserIdAndMetricDateBetweenOrderByMetricDateAsc(UUID userId, LocalDate from, LocalDate to);
}
