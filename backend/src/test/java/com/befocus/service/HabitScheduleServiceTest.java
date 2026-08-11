package com.befocus.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.befocus.entity.Habit;
import com.befocus.entity.HabitEntry;
import com.befocus.entity.ScheduleType;

class HabitScheduleServiceTest {

    private final HabitScheduleService service = new HabitScheduleService();

    @Test
    void dailyStreakKeepsPreviousRunWhileTodayIsStillOpen() {
        LocalDate today = LocalDate.of(2026, 8, 12);
        Habit habit = habit(ScheduleType.DAILY);
        List<HabitEntry> entries = entries(habit,
                today.minusDays(3), today.minusDays(2), today.minusDays(1));

        HabitScheduleService.Streaks streaks = service.calculateStreaks(habit, entries, today);

        assertThat(streaks.current()).isEqualTo(3);
        assertThat(streaks.longest()).isEqualTo(3);
    }

    @Test
    void weekdayStreakIgnoresDaysOutsideTheSchedule() {
        LocalDate today = LocalDate.of(2026, 8, 12); // Wednesday
        Habit habit = habit(ScheduleType.WEEKDAYS);
        habit.setWeekdays("1,3,5");
        List<HabitEntry> entries = entries(habit,
                LocalDate.of(2026, 8, 7),
                LocalDate.of(2026, 8, 10));

        HabitScheduleService.Streaks streaks = service.calculateStreaks(habit, entries, today);

        assertThat(service.isScheduledOn(habit, LocalDate.of(2026, 8, 8))).isFalse();
        assertThat(streaks.current()).isEqualTo(2);
        assertThat(streaks.longest()).isEqualTo(2);
    }

    @Test
    void missedScheduledWeekdayBreaksTheRun() {
        LocalDate today = LocalDate.of(2026, 8, 12);
        Habit habit = habit(ScheduleType.WEEKDAYS);
        habit.setWeekdays("1,3,5");
        List<HabitEntry> entries = entries(habit,
                LocalDate.of(2026, 8, 3),
                LocalDate.of(2026, 8, 5),
                LocalDate.of(2026, 8, 10));

        HabitScheduleService.Streaks streaks = service.calculateStreaks(habit, entries, today);

        assertThat(streaks.current()).isEqualTo(1);
        assertThat(streaks.longest()).isEqualTo(2);
    }

    @Test
    void intervalStreakOnlyCountsConfiguredOccurrences() {
        LocalDate today = LocalDate.of(2026, 8, 12);
        Habit habit = habit(ScheduleType.INTERVAL);
        habit.setScheduleStartDate(LocalDate.of(2026, 8, 1));
        habit.setIntervalDays(3);
        List<HabitEntry> entries = entries(habit,
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 8, 4),
                LocalDate.of(2026, 8, 7),
                LocalDate.of(2026, 8, 10));

        HabitScheduleService.Streaks streaks = service.calculateStreaks(habit, entries, today);

        assertThat(service.isScheduledOn(habit, today)).isFalse();
        assertThat(streaks.current()).isEqualTo(4);
        assertThat(streaks.longest()).isEqualTo(4);
    }

    @Test
    void timesPerWeekTreatsCurrentIncompleteWeekAsOpen() {
        LocalDate today = LocalDate.of(2026, 8, 12);
        Habit habit = habit(ScheduleType.TIMES_PER_WEEK);
        habit.setTimesPerWeek(3);
        List<HabitEntry> entries = entries(habit,
                LocalDate.of(2026, 7, 27),
                LocalDate.of(2026, 7, 28),
                LocalDate.of(2026, 7, 29),
                LocalDate.of(2026, 8, 3),
                LocalDate.of(2026, 8, 4),
                LocalDate.of(2026, 8, 5),
                LocalDate.of(2026, 8, 10),
                LocalDate.of(2026, 8, 11));

        HabitScheduleService.Streaks streaks = service.calculateStreaks(habit, entries, today);

        assertThat(streaks.current()).isEqualTo(2);
        assertThat(streaks.longest()).isEqualTo(2);
        assertThat(service.weeklyTargetMet(habit, entries, today)).isFalse();
    }

    @Test
    void completingCurrentWeeklyTargetExtendsTheStreak() {
        LocalDate today = LocalDate.of(2026, 8, 12);
        Habit habit = habit(ScheduleType.TIMES_PER_WEEK);
        habit.setTimesPerWeek(3);
        List<HabitEntry> entries = entries(habit,
                LocalDate.of(2026, 7, 27),
                LocalDate.of(2026, 7, 28),
                LocalDate.of(2026, 7, 29),
                LocalDate.of(2026, 8, 3),
                LocalDate.of(2026, 8, 4),
                LocalDate.of(2026, 8, 5),
                LocalDate.of(2026, 8, 10),
                LocalDate.of(2026, 8, 11),
                today);

        HabitScheduleService.Streaks streaks = service.calculateStreaks(habit, entries, today);

        assertThat(streaks.current()).isEqualTo(3);
        assertThat(streaks.longest()).isEqualTo(3);
        assertThat(service.weeklyTargetMet(habit, entries, today)).isTrue();
    }

    @Test
    void noProgressHasNoStreak() {
        Habit habit = habit(ScheduleType.DAILY);

        HabitScheduleService.Streaks streaks = service.calculateStreaks(
                habit, List.of(), LocalDate.of(2026, 8, 12));

        assertThat(streaks.current()).isZero();
        assertThat(streaks.longest()).isZero();
    }

    private Habit habit(ScheduleType scheduleType) {
        Habit habit = new Habit();
        habit.setScheduleType(scheduleType);
        habit.setTargetValue(BigDecimal.ONE);
        return habit;
    }

    private List<HabitEntry> entries(Habit habit, LocalDate... dates) {
        List<HabitEntry> entries = new ArrayList<>();
        for (LocalDate date : dates) {
            HabitEntry entry = new HabitEntry();
            entry.setHabit(habit);
            entry.setDate(date);
            entry.setValue(BigDecimal.ONE);
            entries.add(entry);
        }
        return entries;
    }
}
