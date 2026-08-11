package com.befocus.mapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

import com.befocus.dto.response.HabitEntryResponse;
import com.befocus.dto.response.HabitResponse;
import com.befocus.entity.Habit;
import com.befocus.entity.HabitEntry;
import com.befocus.service.HabitScheduleService;

@Component
public class HabitMapper {
    private final HabitScheduleService scheduleService;

    public HabitMapper(HabitScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    public HabitResponse toResponse(Habit habit, List<HabitEntry> allEntries, List<HabitEntry> visibleEntries,
            LocalDate today) {
        HabitEntry todayEntry = allEntries.stream().filter(entry -> entry.getDate().equals(today)).findFirst().orElse(null);
        BigDecimal progress = todayEntry == null ? BigDecimal.ZERO : todayEntry.getValue();
        boolean completedToday = todayEntry != null && progress.compareTo(habit.getTargetValue()) >= 0;
        Integer weeklyCompletedOccurrences = null;
        Integer weeklyTargetOccurrences = null;
        boolean weeklyTargetMet = false;
        if (habit.getScheduleType() == com.befocus.entity.ScheduleType.TIMES_PER_WEEK) {
            weeklyCompletedOccurrences = scheduleService.completedOccurrencesInWeek(habit, allEntries, today);
            weeklyTargetOccurrences = habit.getTimesPerWeek();
            weeklyTargetMet = weeklyCompletedOccurrences >= weeklyTargetOccurrences;
        }
        var streaks = scheduleService.calculateStreaks(habit, allEntries, today);
        List<HabitEntryResponse> entries = visibleEntries.stream()
                .map(entry -> new HabitEntryResponse(entry.getId(), entry.getDate(), entry.getValue(), entry.getNote(),
                        entry.getValue().compareTo(habit.getTargetValue()) >= 0))
                .toList();
        return new HabitResponse(habit.getId(), habit.getName(), habit.getDescription(), habit.getType(),
                habit.getTargetValue(), habit.getUnit(), habit.getScheduleType(), scheduleService.weekdays(habit),
                habit.getTimesPerWeek(), habit.getIntervalDays(), habit.getScheduleStartDate(), habit.getReminderTime(),
                habit.getColor(), habit.getArchivedAt(), scheduleService.isScheduledOn(habit, today), progress,
                habit.getTargetValue(), completedToday, weeklyCompletedOccurrences, weeklyTargetOccurrences,
                weeklyTargetMet, streaks.current(), streaks.longest(), entries);
    }
}
