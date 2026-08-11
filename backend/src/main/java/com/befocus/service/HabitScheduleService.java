package com.befocus.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.befocus.entity.Habit;
import com.befocus.entity.HabitEntry;
import com.befocus.entity.ScheduleType;

@Service
public class HabitScheduleService {

    public record Streaks(int current, int longest) {
    }

    public boolean isScheduledOn(Habit habit, LocalDate date) {
        return switch (habit.getScheduleType()) {
            case DAILY -> true;
            case WEEKDAYS -> weekdaySet(habit).contains(date.getDayOfWeek().getValue());
            case INTERVAL -> isIntervalDate(habit, date);
            case TIMES_PER_WEEK -> true;
        };
    }

    public Streaks calculateStreaks(Habit habit, List<HabitEntry> entries, LocalDate today) {
        if (entries.isEmpty()) {
            return new Streaks(0, 0);
        }
        return habit.getScheduleType() == ScheduleType.TIMES_PER_WEEK
                ? calculateWeeklyStreaks(habit, entries, today)
                : calculateOccurrenceStreaks(habit, entries, today);
    }

    private Streaks calculateOccurrenceStreaks(Habit habit, List<HabitEntry> entries, LocalDate today) {
        Map<LocalDate, Boolean> completed = completionMap(habit, entries);
        LocalDate first = entries.stream().map(HabitEntry::getDate).min(Comparator.naturalOrder()).orElse(today);
        if (habit.getScheduleType() == ScheduleType.INTERVAL && habit.getScheduleStartDate().isAfter(first)) {
            first = habit.getScheduleStartDate();
        }

        int longest = 0;
        int run = 0;
        LocalDate max = entries.stream().map(HabitEntry::getDate).max(Comparator.naturalOrder()).orElse(today);
        LocalDate end = max.isAfter(today) ? max : today;
        for (LocalDate date = first; !date.isAfter(end); date = date.plusDays(1)) {
            if (!isScheduledOn(habit, date)) {
                continue;
            }
            if (Boolean.TRUE.equals(completed.get(date))) {
                run++;
                longest = Math.max(longest, run);
            } else {
                run = 0;
            }
        }

        LocalDate cursor = today;
        if (isScheduledOn(habit, cursor) && !Boolean.TRUE.equals(completed.get(cursor))) {
            cursor = previousScheduled(habit, cursor.minusDays(1), first);
        } else if (!isScheduledOn(habit, cursor)) {
            cursor = previousScheduled(habit, cursor, first);
        }

        int current = 0;
        while (cursor != null && !cursor.isBefore(first)) {
            if (!Boolean.TRUE.equals(completed.get(cursor))) {
                break;
            }
            current++;
            cursor = previousScheduled(habit, cursor.minusDays(1), first);
        }
        return new Streaks(current, longest);
    }

    private Streaks calculateWeeklyStreaks(Habit habit, List<HabitEntry> entries, LocalDate today) {
        Map<LocalDate, Integer> completedPerWeek = new HashMap<>();
        for (HabitEntry entry : entries) {
            if (entry.getValue().compareTo(habit.getTargetValue()) >= 0) {
                completedPerWeek.merge(weekStart(entry.getDate()), 1, Integer::sum);
            }
        }
        LocalDate firstWeek = entries.stream().map(HabitEntry::getDate).min(Comparator.naturalOrder())
                .map(this::weekStart).orElse(weekStart(today));
        LocalDate currentWeek = weekStart(today);
        LocalDate maxWeek = entries.stream().map(HabitEntry::getDate).max(Comparator.naturalOrder())
                .map(this::weekStart).orElse(currentWeek);
        LocalDate endWeek = maxWeek.isAfter(currentWeek) ? maxWeek : currentWeek;

        int target = habit.getTimesPerWeek();
        int longest = 0;
        int run = 0;
        for (LocalDate week = firstWeek; !week.isAfter(endWeek); week = week.plusWeeks(1)) {
            if (completedPerWeek.getOrDefault(week, 0) >= target) {
                run++;
                longest = Math.max(longest, run);
            } else {
                run = 0;
            }
        }

        LocalDate cursor = currentWeek;
        if (completedPerWeek.getOrDefault(cursor, 0) < target) {
            cursor = cursor.minusWeeks(1); // Current week remains open until its local boundary.
        }
        int current = 0;
        while (!cursor.isBefore(firstWeek) && completedPerWeek.getOrDefault(cursor, 0) >= target) {
            current++;
            cursor = cursor.minusWeeks(1);
        }
        return new Streaks(current, longest);
    }

    public int completedOccurrencesInWeek(Habit habit, List<HabitEntry> entries, LocalDate date) {
        if (habit.getScheduleType() != ScheduleType.TIMES_PER_WEEK) {
            return 0;
        }
        LocalDate start = weekStart(date);
        LocalDate end = start.plusDays(6);
        return Math.toIntExact(entries.stream()
                .filter(entry -> !entry.getDate().isBefore(start) && !entry.getDate().isAfter(end))
                .filter(entry -> entry.getValue().compareTo(habit.getTargetValue()) >= 0)
                .count());
    }

    public boolean weeklyTargetMet(Habit habit, List<HabitEntry> entries, LocalDate date) {
        return habit.getScheduleType() == ScheduleType.TIMES_PER_WEEK
                && completedOccurrencesInWeek(habit, entries, date) >= habit.getTimesPerWeek();
    }

    private Map<LocalDate, Boolean> completionMap(Habit habit, List<HabitEntry> entries) {
        Map<LocalDate, Boolean> result = new HashMap<>();
        for (HabitEntry entry : entries) {
            result.put(entry.getDate(), entry.getValue().compareTo(habit.getTargetValue()) >= 0);
        }
        return result;
    }

    private LocalDate previousScheduled(Habit habit, LocalDate from, LocalDate lowerBound) {
        for (LocalDate date = from; !date.isBefore(lowerBound); date = date.minusDays(1)) {
            if (isScheduledOn(habit, date)) {
                return date;
            }
        }
        return null;
    }

    private boolean isIntervalDate(Habit habit, LocalDate date) {
        if (habit.getScheduleStartDate() == null || habit.getIntervalDays() == null
                || date.isBefore(habit.getScheduleStartDate())) {
            return false;
        }
        return ChronoUnit.DAYS.between(habit.getScheduleStartDate(), date) % habit.getIntervalDays() == 0;
    }

    private Set<Integer> weekdaySet(Habit habit) {
        if (habit.getWeekdays() == null || habit.getWeekdays().isBlank()) {
            return Set.of();
        }
        Set<Integer> result = new HashSet<>();
        for (String value : habit.getWeekdays().split(",")) {
            result.add(Integer.parseInt(value));
        }
        return result;
    }

    public List<Integer> weekdays(Habit habit) {
        if (habit.getWeekdays() == null || habit.getWeekdays().isBlank()) {
            return List.of();
        }
        List<Integer> result = new ArrayList<>();
        for (String value : habit.getWeekdays().split(",")) {
            result.add(Integer.parseInt(value));
        }
        return result;
    }

    private LocalDate weekStart(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}
