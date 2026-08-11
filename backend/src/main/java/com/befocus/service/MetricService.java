package com.befocus.service;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.entity.DailyMetric;
import com.befocus.entity.User;
import com.befocus.entity.WeeklyMetric;
import com.befocus.exception.ApiException;
import com.befocus.repository.DailyMetricRepository;
import com.befocus.repository.UserRepository;
import com.befocus.repository.WeeklyMetricRepository;

@Service
public class MetricService {
    private final DailyMetricRepository dailyRepository;
    private final WeeklyMetricRepository weeklyRepository;
    private final UserRepository userRepository;

    public MetricService(DailyMetricRepository dailyRepository, WeeklyMetricRepository weeklyRepository,
            UserRepository userRepository) {
        this.dailyRepository = dailyRepository;
        this.weeklyRepository = weeklyRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void habitCompletionDelta(User user, LocalDate date, int delta) {
        User metricUser = lockUser(user);
        DailyMetric daily = dailyRepository.findByUserIdAndMetricDate(metricUser.getId(), date).orElseGet(() -> {
            DailyMetric metric = new DailyMetric();
            metric.setUser(metricUser);
            metric.setMetricDate(date);
            return metric;
        });
        daily.setHabitCompletions(Math.max(0, daily.getHabitCompletions() + delta));
        dailyRepository.save(daily);

        LocalDate weekStart = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        WeeklyMetric weekly = weeklyRepository.findByUserIdAndWeekStart(metricUser.getId(), weekStart).orElseGet(() -> {
            WeeklyMetric metric = new WeeklyMetric();
            metric.setUser(metricUser);
            metric.setWeekStart(weekStart);
            return metric;
        });
        weekly.setHabitCompletions(Math.max(0, weekly.getHabitCompletions() + delta));
        weeklyRepository.save(weekly);
    }

    @Transactional
    public void focusCompleted(User user, LocalDate date, int minutes) {
        User metricUser = lockUser(user);
        DailyMetric daily = dailyRepository.findByUserIdAndMetricDate(metricUser.getId(), date).orElseGet(() -> {
            DailyMetric metric = new DailyMetric();
            metric.setUser(metricUser);
            metric.setMetricDate(date);
            return metric;
        });
        daily.setFocusMinutes(daily.getFocusMinutes() + minutes);
        daily.setCompletedSessions(daily.getCompletedSessions() + 1);
        dailyRepository.save(daily);

        LocalDate weekStart = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        WeeklyMetric weekly = weeklyRepository.findByUserIdAndWeekStart(metricUser.getId(), weekStart).orElseGet(() -> {
            WeeklyMetric metric = new WeeklyMetric();
            metric.setUser(metricUser);
            metric.setWeekStart(weekStart);
            return metric;
        });
        weekly.setFocusMinutes(weekly.getFocusMinutes() + minutes);
        weekly.setCompletedSessions(weekly.getCompletedSessions() + 1);
        weeklyRepository.save(weekly);
    }

    @Transactional
    public void focusCancelled(User user, LocalDate date) {
        User metricUser = lockUser(user);
        DailyMetric daily = dailyRepository.findByUserIdAndMetricDate(metricUser.getId(), date).orElseGet(() -> {
            DailyMetric metric = new DailyMetric();
            metric.setUser(metricUser);
            metric.setMetricDate(date);
            return metric;
        });
        daily.setCancelledSessions(daily.getCancelledSessions() + 1);
        dailyRepository.save(daily);

        LocalDate weekStart = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        WeeklyMetric weekly = weeklyRepository.findByUserIdAndWeekStart(metricUser.getId(), weekStart).orElseGet(() -> {
            WeeklyMetric metric = new WeeklyMetric();
            metric.setUser(metricUser);
            metric.setWeekStart(weekStart);
            return metric;
        });
        weekly.setCancelledSessions(weekly.getCancelledSessions() + 1);
        weeklyRepository.save(weekly);
    }

    @Transactional
    public void interruption(User user, LocalDate date) {
        User metricUser = lockUser(user);
        DailyMetric daily = dailyRepository.findByUserIdAndMetricDate(metricUser.getId(), date).orElseGet(() -> {
            DailyMetric metric = new DailyMetric();
            metric.setUser(metricUser);
            metric.setMetricDate(date);
            return metric;
        });
        daily.setInterruptionCount(daily.getInterruptionCount() + 1);
        dailyRepository.save(daily);

        LocalDate weekStart = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        WeeklyMetric weekly = weeklyRepository.findByUserIdAndWeekStart(metricUser.getId(), weekStart).orElseGet(() -> {
            WeeklyMetric metric = new WeeklyMetric();
            metric.setUser(metricUser);
            metric.setWeekStart(weekStart);
            return metric;
        });
        weekly.setInterruptionCount(weekly.getInterruptionCount() + 1);
        weeklyRepository.save(weekly);
    }
    private User lockUser(User user) {
        return userRepository.findByIdForUpdate(user.getId())
                .orElseThrow(() -> ApiException.unauthorized("User account no longer exists."));
    }
}
