package com.befocus.service;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.response.ActivityItem;
import com.befocus.dto.response.AnalyticsBreakdown;
import com.befocus.dto.response.DashboardResponse;
import com.befocus.dto.response.FocusAnalyticsResponse;
import com.befocus.dto.response.FocusSessionResponse;
import com.befocus.dto.response.HabitAnalyticsResponse;
import com.befocus.entity.FocusSession;
import com.befocus.entity.FocusStatus;
import com.befocus.entity.Habit;
import com.befocus.entity.HabitEntry;
import com.befocus.entity.ScheduleType;
import com.befocus.entity.TaskStatus;
import com.befocus.entity.User;
import com.befocus.mapper.FocusMapper;
import com.befocus.repository.DailyMetricRepository;
import com.befocus.repository.FocusInterruptionRepository;
import com.befocus.repository.FocusSessionRepository;
import com.befocus.repository.HabitEntryRepository;
import com.befocus.repository.HabitRepository;
import com.befocus.repository.TaskRepository;
import com.befocus.repository.UserRepository;

@Service
public class AnalyticsService {
    private final UserRepository userRepository;
    private final HabitRepository habitRepository;
    private final HabitEntryRepository entryRepository;
    private final HabitScheduleService scheduleService;
    private final FocusSessionRepository focusRepository;
    private final FocusInterruptionRepository interruptionRepository;
    private final TaskRepository taskRepository;
    private final DailyMetricRepository dailyMetricRepository;
    private final FocusMapper focusMapper;
    private final Clock clock;

    public AnalyticsService(UserRepository userRepository, HabitRepository habitRepository,
            HabitEntryRepository entryRepository, HabitScheduleService scheduleService,
            FocusSessionRepository focusRepository, FocusInterruptionRepository interruptionRepository,
            TaskRepository taskRepository, DailyMetricRepository dailyMetricRepository, FocusMapper focusMapper,
            Clock clock) {
        this.userRepository = userRepository;
        this.habitRepository = habitRepository;
        this.entryRepository = entryRepository;
        this.scheduleService = scheduleService;
        this.focusRepository = focusRepository;
        this.interruptionRepository = interruptionRepository;
        this.taskRepository = taskRepository;
        this.dailyMetricRepository = dailyMetricRepository;
        this.focusMapper = focusMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(UUID userId, LocalDate requestedDate) {
        User user = user(userId);
        LocalDate today = requestedDate == null ? now(user) : requestedDate;
        List<Habit> habits = habitRepository.findAllByUserIdAndArchivedAtIsNullOrderByCreatedAtAsc(userId);
        int habitCompleted = 0;
        int habitMinutes = 0;
        int currentStreak = 0;
        for (Habit habit : habits) {
            List<HabitEntry> entries = entryRepository.findAllByHabitIdOrderByDateAsc(habit.getId());
            if (scheduleService.isScheduledOn(habit, today)) {
                HabitEntry entry = entries.stream().filter(item -> item.getDate().equals(today)).findFirst().orElse(null);
                if (entry != null) {
                    if (entry.getValue().compareTo(habit.getTargetValue()) >= 0) habitCompleted++;
                    if (habit.getType() == com.befocus.entity.HabitType.DURATION) habitMinutes += entry.getValue().intValue();
                }
            }
            currentStreak = Math.max(currentStreak, scheduleService.calculateStreaks(habit, entries, today).current());
        }
        List<FocusSession> completedToday = completedSessions(userId, today, today);
        int focusMinutes = totalMinutes(completedToday);
        long totalTasks = taskRepository.countByUserIdAndDueDateAndStatus(userId, today, TaskStatus.PENDING)
                + taskRepository.countByUserIdAndDueDateAndStatus(userId, today, TaskStatus.COMPLETED);
        long completedTasks = taskRepository.countByUserIdAndDueDateAndStatus(userId, today, TaskStatus.COMPLETED);
        List<DashboardResponse.WeeklyFocusPoint> weekly = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            weekly.add(new DashboardResponse.WeeklyFocusPoint(date, totalMinutes(completedSessions(userId, date, date))));
        }
        List<ActivityItem> activity = focusRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(session -> new ActivityItem(session.getId(), session.getStatus().name(),
                        session.getTask() != null ? session.getTask().getTitle() : "Phiên tập trung",
                        session.getStatus() == FocusStatus.COMPLETED ? totalMinutes(List.of(session)) + " phút đã ghi nhận" : "Phiên chưa hoàn thành",
                        session.getCompletedAt() != null ? session.getCompletedAt() : session.getCreatedAt()))
                .toList();
        FocusSessionResponse active = focusRepository.findActiveByUser(userId, List.of(FocusStatus.RUNNING, FocusStatus.PAUSED))
                .stream().findFirst().map(focusMapper::toResponse).orElse(null);
        String[] names = user.getName().trim().split("\\s+");
        return new DashboardResponse(today, "Chào " + names[names.length - 1],
                new DashboardResponse.HabitSummary(habitCompleted, habits.stream().filter(h -> scheduleService.isScheduledOn(h, today)).toList().size(), habitMinutes),
                focusMinutes, new DashboardResponse.TaskSummary(completedTasks, totalTasks), currentStreak, weekly, activity, active);
    }

    @Transactional(readOnly = true)
    public FocusAnalyticsResponse focus(UUID userId, LocalDate from, LocalDate to) {
        User user = user(userId);
        LocalDate[] range = normalizedRange(user, from, to);
        List<FocusSession> completed = completedSessions(userId, range[0], range[1]);
        List<FocusSession> cancelled = focusRepository.findAllByUserIdAndStatusAndCompletedAtBetween(userId, FocusStatus.CANCELLED,
                startOf(range[0], zone(user)), endOf(range[1], zone(user)));
        int totalMinutes = totalMinutes(completed);
        int interruptions = completed.stream().mapToInt(session -> interruptionRepository.findAllByFocusSessionIdOrderByOccurredAtAsc(session.getId()).size()).sum();
        List<String> insights = new ArrayList<>();
        if (completed.isEmpty()) insights.add("Hoàn thành phiên đầu tiên để bắt đầu thấy nhịp tập trung của bạn.");
        else {
            completed.stream().max(Comparator.comparingInt(this::sessionMinutes)).ifPresent(session -> insights.add("Phiên dài nhất của bạn là " + sessionMinutes(session) + " phút."));
            if (interruptions > completed.size()) insights.add("Bạn đang có khá nhiều gián đoạn; thử ghi chú nguyên nhân để điều chỉnh môi trường.");
        }
        double completionRate = completed.size() + cancelled.size() == 0 ? 0 : completed.size() * 100d / (completed.size() + cancelled.size());
        return new FocusAnalyticsResponse(totalMinutes, completed.isEmpty() ? 0 : Math.round((float) totalMinutes / completed.size()),
                completed.size(), completionRate, breakdown(completed, session -> session.getProject() == null ? "Độc lập" : session.getProject().getName()),
                breakdown(completed, session -> session.getTask() == null ? "Không gắn việc" : session.getTask().getTitle()),
                breakdown(completed, session -> session.getHabit() == null ? "Không gắn thói quen" : session.getHabit().getName()),
                breakdown(completed, session -> session.getStartedAt() == null ? "Không rõ" : session.getStartedAt().atZone(zone(user)).getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.forLanguageTag("vi-VN"))),
                breakdown(completed, session -> session.getStartedAt() == null ? "Không rõ" : String.valueOf(session.getStartedAt().atZone(zone(user)).getHour())),
                interruptions, insights);
    }

    @Transactional(readOnly = true)
    public HabitAnalyticsResponse habits(UUID userId, LocalDate from, LocalDate to) {
        User user = user(userId);
        LocalDate[] range = normalizedRange(user, from, to);
        List<Habit> habits = habitRepository.findAllByUserIdAndArchivedAtIsNullOrderByCreatedAtAsc(userId);
        Map<UUID, List<HabitEntry>> entries = habits.stream().collect(Collectors.toMap(Habit::getId,
                habit -> entryRepository.findAllByHabitIdAndDateBetweenOrderByDateAsc(habit.getId(), range[0], range[1])));
        int scheduledTotal = 0;
        int completedTotal = 0;
        int current = 0;
        int longest = 0;
        List<HabitAnalyticsResponse.HabitBreakdown> habitBreakdowns = new ArrayList<>();
        for (Habit habit : habits) {
            List<HabitEntry> all = entryRepository.findAllByHabitIdOrderByDateAsc(habit.getId());
            var streaks = scheduleService.calculateStreaks(habit, all, now(user));
            current = Math.max(current, streaks.current());
            longest = Math.max(longest, streaks.longest());
            int scheduled = 0;
            int completed = 0;
            for (LocalDate date = range[0]; !date.isAfter(range[1]); date = date.plusDays(1)) {
                if (scheduleService.isScheduledOn(habit, date)) scheduled++;
                if (hasCompleted(entries.get(habit.getId()), habit, date)) completed++;
            }
            scheduledTotal += scheduled;
            completedTotal += completed;
            habitBreakdowns.add(new HabitAnalyticsResponse.HabitBreakdown(habit.getId().toString(), habit.getName(),
                    scheduled == 0 ? 0 : completed * 100d / scheduled, streaks.current(), streaks.longest()));
        }
        List<HabitAnalyticsResponse.DailyProgressPoint> daily = new ArrayList<>();
        List<HabitAnalyticsResponse.HeatmapCell> heatmap = new ArrayList<>();
        for (LocalDate date = range[0]; !date.isAfter(range[1]); date = date.plusDays(1)) {
            int total = 0;
            int complete = 0;
            for (Habit habit : habits) {
                if (scheduleService.isScheduledOn(habit, date)) {
                    total++;
                    if (hasCompleted(entries.get(habit.getId()), habit, date)) complete++;
                }
            }
            daily.add(new HabitAnalyticsResponse.DailyProgressPoint(date.toString(), complete, total, total == 0 ? 0 : complete * 100d / total));
            heatmap.add(new HabitAnalyticsResponse.HeatmapCell(date.toString(), complete, total, total > 0 && complete == total));
        }
        double rate = scheduledTotal == 0 ? 0 : completedTotal * 100d / scheduledTotal;
        Map<LocalDate, int[]> weeklyTotals = new LinkedHashMap<>();
        for (HabitAnalyticsResponse.DailyProgressPoint point : daily) {
            LocalDate date = LocalDate.parse(point.date());
            LocalDate week = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            int[] totals = weeklyTotals.computeIfAbsent(week, ignored -> new int[2]);
            totals[0] += point.completed();
            totals[1] += point.total();
        }
        List<HabitAnalyticsResponse.WeeklyProgressPoint> weekly = weeklyTotals.entrySet().stream()
                .map(entry -> new HabitAnalyticsResponse.WeeklyProgressPoint(entry.getKey().toString(), entry.getValue()[0],
                        entry.getValue()[1], entry.getValue()[1] == 0 ? 0 : entry.getValue()[0] * 100d / entry.getValue()[1]))
                .toList();
        return new HabitAnalyticsResponse(rate, current, longest, rate, daily, weekly, heatmap, habitBreakdowns);
    }

    private List<AnalyticsBreakdown> breakdown(List<FocusSession> sessions, Function<FocusSession, String> keyFunction) {
        Map<String, List<FocusSession>> groups = sessions.stream().collect(Collectors.groupingBy(keyFunction, LinkedHashMap::new, Collectors.toList()));
        return groups.entrySet().stream().map(entry -> {
            int minutes = totalMinutes(entry.getValue());
            return new AnalyticsBreakdown(entry.getKey(), entry.getKey(), entry.getKey(), minutes, minutes, entry.getValue().size(), 100);
        }).sorted(Comparator.comparingInt(AnalyticsBreakdown::minutes).reversed()).toList();
    }

    private boolean hasCompleted(List<HabitEntry> entries, Habit habit, LocalDate date) {
        return entries.stream().anyMatch(entry -> entry.getDate().equals(date)
                && entry.getValue().compareTo(habit.getTargetValue()) >= 0);
    }

    private List<FocusSession> completedSessions(UUID userId, LocalDate from, LocalDate to) {
        User user = user(userId);
        return focusRepository.findAllByUserIdAndStatusAndCompletedAtBetween(userId, FocusStatus.COMPLETED,
                startOf(from, zone(user)), endOf(to, zone(user)));
    }

    private LocalDate[] normalizedRange(User user, LocalDate from, LocalDate to) {
        LocalDate today = now(user);
        LocalDate start = from == null ? today.minusDays(29) : from;
        LocalDate end = to == null ? today : to;
        if (start.isAfter(end)) throw com.befocus.exception.ApiException.validation("Date range is invalid.", Map.of("from", "from must be on or before to."));
        if (java.time.temporal.ChronoUnit.DAYS.between(start, end) > 366) throw com.befocus.exception.ApiException.validation("Date range is too large.", Map.of("to", "Use a range of at most 366 days."));
        return new LocalDate[] { start, end };
    }

    private int totalMinutes(List<FocusSession> sessions) { return sessions.stream().mapToInt(this::sessionMinutes).sum(); }
    private int sessionMinutes(FocusSession session) { return session.getActualDurationMinutes() == null ? 0 : session.getActualDurationMinutes(); }
    private User user(UUID id) { return userRepository.findById(id).orElseThrow(() -> com.befocus.exception.ApiException.unauthorized("User account no longer exists.")); }
    private LocalDate now(User user) { return clock.instant().atZone(zone(user)).toLocalDate(); }
    private ZoneId zone(User user) { try { return ZoneId.of(user.getTimezone()); } catch (DateTimeException ex) { return ZoneId.of("UTC"); } }
    private Instant startOf(LocalDate date, ZoneId zone) { return date.atStartOfDay(zone).toInstant(); }
    private Instant endOf(LocalDate date, ZoneId zone) { return date.plusDays(1).atStartOfDay(zone).toInstant().minusNanos(1); }
}
