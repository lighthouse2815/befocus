package com.befocus.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.befocus.entity.HabitType;
import com.befocus.entity.ScheduleType;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record HabitRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 1000) String description,
        @NotNull HabitType type,
        @NotNull @DecimalMin(value = "0.01") @DecimalMax(value = "1000000") BigDecimal targetValue,
        @Size(max = 32) String unit,
        @NotNull ScheduleType scheduleType,
        List<Integer> weekdays,
        Integer timesPerWeek,
        Integer intervalDays,
        LocalDate scheduleStartDate,
        LocalTime reminderTime,
        @Size(max = 24) String color) {
}
