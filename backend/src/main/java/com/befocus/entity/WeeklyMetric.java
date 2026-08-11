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
@Table(name = "weekly_metrics", uniqueConstraints = @UniqueConstraint(name = "uq_weekly_metrics_user_week", columnNames = { "user_id", "week_start" }))
@Getter
@Setter
@NoArgsConstructor
public class WeeklyMetric extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    private int focusMinutes;
    private int completedSessions;
    private int cancelledSessions;
    private int interruptionCount;
    private int habitCompletions;
}
