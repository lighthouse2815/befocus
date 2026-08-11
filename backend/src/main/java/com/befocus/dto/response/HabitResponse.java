package com.befocus.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import com.befocus.entity.HabitType;
import com.befocus.entity.ScheduleType;

public record HabitResponse(
        UUID id,
        String name,
        String description,
        HabitType type,
        BigDecimal targetValue,
        String unit,
        ScheduleType scheduleType,
        List<Integer> weekdays,
        Integer timesPerWeek,
        Integer intervalDays,
        LocalDate scheduleStartDate,
        LocalTime reminderTime,
        String color,
        Instant archivedAt,
        boolean scheduledToday,
        BigDecimal todayProgress,
        BigDecimal todayTarget,
        boolean completedToday,
        Integer weeklyCompletedOccurrences,
        Integer weeklyTargetOccurrences,
        boolean weeklyTargetMet,
        int currentStreak,
        int longestStreak,
        List<HabitEntryResponse> entries) {
}
