package com.befocus.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "daily_metrics", uniqueConstraints = @UniqueConstraint(name = "uq_daily_metrics_user_date", columnNames = { "user_id", "metric_date" }))
@Getter
@Setter
@NoArgsConstructor
public class DailyMetric extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    private int focusMinutes;
    private int completedSessions;
    private int cancelledSessions;
    private int interruptionCount;
    private int habitCompletions;
}
