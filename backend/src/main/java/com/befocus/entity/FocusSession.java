package com.befocus.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "focus_sessions")
@Getter
@Setter
@NoArgsConstructor
public class FocusSession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id")
    private Habit habit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private FocusStatus status;

    @Column(name = "planned_duration_minutes", nullable = false)
    private int plannedDurationMinutes;

    @Column(name = "actual_duration_minutes")
    private Integer actualDurationMinutes;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "expected_end_at")
    private Instant expectedEndAt;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "total_paused_seconds", nullable = false)
    private long totalPausedSeconds;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;
}
