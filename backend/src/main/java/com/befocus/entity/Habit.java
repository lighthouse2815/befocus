package com.befocus.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

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
@Table(name = "habits")
@Getter
@Setter
@NoArgsConstructor
public class Habit extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private HabitType type;

    @Column(name = "target_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal targetValue;

    @Column(length = 32)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", nullable = false, length = 24)
    private ScheduleType scheduleType;

    @Column(length = 32)
    private String weekdays;

    @Column(name = "times_per_week")
    private Integer timesPerWeek;

    @Column(name = "interval_days")
    private Integer intervalDays;

    @Column(name = "schedule_start_date")
    private LocalDate scheduleStartDate;

    @Column(name = "reminder_time")
    private LocalTime reminderTime;

    @Column(nullable = false, length = 24)
    private String color = "moss";

    @Column(name = "archived_at")
    private Instant archivedAt;

    public boolean isArchived() {
        return archivedAt != null;
    }
}
