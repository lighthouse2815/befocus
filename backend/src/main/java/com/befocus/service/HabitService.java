package com.befocus.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.HabitEntryRequest;
import com.befocus.dto.request.HabitRequest;
import com.befocus.dto.response.HabitEntryResponse;
import com.befocus.dto.response.HabitResponse;
import com.befocus.entity.Habit;
import com.befocus.entity.HabitEntry;
import com.befocus.entity.HabitType;
import com.befocus.entity.ScheduleType;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.mapper.HabitMapper;
import com.befocus.repository.HabitEntryRepository;
import com.befocus.repository.HabitRepository;
import com.befocus.repository.UserRepository;

@Service
public class HabitService {
    private static final Set<String> ALLOWED_COLORS = Set.of("moss", "clay", "ink", "ocean", "plum", "amber");
    private final HabitRepository habitRepository;
    private final HabitEntryRepository entryRepository;
    private final UserRepository userRepository;
    private final MetricService metricService;
    private final HabitMapper mapper;
    private final HabitScheduleService scheduleService;
    private final Clock clock;

    public HabitService(HabitRepository habitRepository, HabitEntryRepository entryRepository,
            UserRepository userRepository, MetricService metricService, HabitMapper mapper,
            HabitScheduleService scheduleService, Clock clock) {
        this.habitRepository = habitRepository;
        this.entryRepository = entryRepository;
        this.userRepository = userRepository;
        this.metricService = metricService;
        this.mapper = mapper;
        this.scheduleService = scheduleService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<HabitResponse> list(UUID userId, boolean includeArchived) {
        List<Habit> habits = new ArrayList<>(habitRepository.findAllByUserIdAndArchivedAtIsNullOrderByCreatedAtAsc(userId));
        if (includeArchived) {
            habits.addAll(habitRepository.findAllByUserIdAndArchivedAtIsNotNullOrderByArchivedAtDesc(userId));
        }
        if (habits.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<HabitEntry>> entriesByHabit = new HashMap<>();
        for (HabitEntry entry : entryRepository.findAllByHabitIdInOrderByDateAsc(habits.stream().map(Habit::getId).toList())) {
            entriesByHabit.computeIfAbsent(entry.getHabit().getId(), ignored -> new ArrayList<>()).add(entry);
        }
        LocalDate today = today(userId);
        return habits.stream().map(habit -> mapper.toResponse(habit, entriesByHabit.getOrDefault(habit.getId(), List.of()),
                List.of(), today)).toList();
    }

    @Transactional(readOnly = true)
    public HabitResponse get(UUID userId, UUID habitId, LocalDate from, LocalDate to) {
        Habit habit = require(userId, habitId);
        List<HabitEntry> allEntries = entryRepository.findAllByHabitIdOrderByDateAsc(habitId);
        LocalDate today = today(userId);
        LocalDate rangeTo = to == null ? today : to;
        LocalDate rangeFrom = from == null ? rangeTo.minusDays(90) : from;
        if (rangeFrom.isAfter(rangeTo)) {
            throw ApiException.validation("Date range is invalid.", Map.of("from", "from must be on or before to."));
        }
        List<HabitEntry> visible = allEntries.stream().filter(e -> !e.getDate().isBefore(rangeFrom) && !e.getDate().isAfter(rangeTo)).toList();
        return mapper.toResponse(habit, allEntries, visible, today);
    }

    @Transactional
    public HabitResponse create(UUID userId, HabitRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.unauthorized("User account no longer exists."));
        Habit habit = new Habit();
        habit.setUser(user);
        apply(habit, request);
        return get(userId, habitRepository.save(habit).getId(), null, null);
    }

    @Transactional
    public HabitResponse update(UUID userId, UUID habitId, HabitRequest request) {
        Habit habit = requireForUpdate(userId, habitId);
        List<HabitEntry> entries = entryRepository.findAllByHabitIdOrderByDateAsc(habitId);
        if (!entries.isEmpty() && habit.getType() != request.type()) {
            throw ApiException.validation("Habit type cannot change after progress has been recorded.",
                    Map.of("type", "Delete the existing progress before changing the habit type."));
        }
        BigDecimal previousTarget = habit.getTargetValue();
        apply(habit, request);
        if (previousTarget.compareTo(habit.getTargetValue()) != 0) {
            for (HabitEntry entry : entries) {
                boolean wasCompleted = entry.getValue().compareTo(previousTarget) >= 0;
                boolean isCompleted = entry.getValue().compareTo(habit.getTargetValue()) >= 0;
                if (wasCompleted != isCompleted) {
                    metricService.habitCompletionDelta(habit.getUser(), entry.getDate(), isCompleted ? 1 : -1);
                }
            }
        }
        return get(userId, habitId, null, null);
    }

    @Transactional
    public void archive(UUID userId, UUID habitId) {
        Habit habit = requireForUpdate(userId, habitId);
        if (!habit.isArchived()) {
            habit.setArchivedAt(clock.instant());
            habitRepository.save(habit);
        }
    }

    @Transactional
    public void delete(UUID userId, UUID habitId) {
        Habit habit = requireForUpdate(userId, habitId);
        List<HabitEntry> entries = entryRepository.findAllByHabitIdOrderByDateAsc(habitId);
        for (HabitEntry entry : entries) {
            if (entry.getValue().compareTo(habit.getTargetValue()) >= 0) {
                metricService.habitCompletionDelta(habit.getUser(), entry.getDate(), -1);
            }
        }
        entryRepository.deleteAll(entries);
        entryRepository.flush();
        habitRepository.delete(habit);
    }

    @Transactional
    public HabitEntryResponse upsertEntry(UUID userId, UUID habitId, LocalDate date, HabitEntryRequest request) {
        Habit habit = requireForUpdate(userId, habitId);
        if (habit.isArchived()) {
            throw ApiException.invalidState("Archived habits cannot receive new progress.");
        }
        LocalDate today = today(userId);
        if (date.isAfter(today)) {
            throw ApiException.validation("Entry date cannot be in the future.", Map.of("date", "Use today or a past date."));
        }
        if (!scheduleService.isScheduledOn(habit, date)) {
            throw ApiException.validation("The habit is not scheduled on this date.",
                    Map.of("date", "Choose a date included in the habit schedule."));
        }
        if (habit.getType() == HabitType.BOOLEAN
                && request.value().compareTo(BigDecimal.ZERO) != 0
                && request.value().compareTo(BigDecimal.ONE) != 0) {
            throw ApiException.validation("Boolean habit progress must be zero or one.",
                    Map.of("value", "Use 0 or 1 for a BOOLEAN habit."));
        }
        HabitEntry entry = entryRepository.findByHabitIdAndDateForUpdate(habitId, date).orElseGet(() -> {
            HabitEntry created = new HabitEntry();
            created.setHabit(habit);
            created.setDate(date);
            created.setValue(BigDecimal.ZERO);
            return created;
        });
        boolean before = entry.getValue().compareTo(habit.getTargetValue()) >= 0;
        entry.setValue(request.value());
        entry.setNote(blankToNull(request.note()));
        entryRepository.save(entry);
        boolean after = entry.getValue().compareTo(habit.getTargetValue()) >= 0;
        if (before != after) {
            metricService.habitCompletionDelta(habit.getUser(), date, after ? 1 : -1);
        }
        return new HabitEntryResponse(entry.getId(), entry.getDate(), entry.getValue(), entry.getNote(), after);
    }

    @Transactional
    public void deleteEntry(UUID userId, UUID habitId, LocalDate date) {
        Habit habit = requireForUpdate(userId, habitId);
        entryRepository.findByHabitIdAndDateForUpdate(habitId, date).ifPresent(entry -> {
            boolean completed = entry.getValue().compareTo(habit.getTargetValue()) >= 0;
            entryRepository.delete(entry);
            if (completed) {
                metricService.habitCompletionDelta(habit.getUser(), date, -1);
            }
        });
    }

    /** Adds focus minutes to a linked duration habit without creating duplicate entries. */
    @Transactional
    public void addDurationFromFocus(UUID userId, UUID habitId, LocalDate date, int minutes) {
        if (minutes <= 0) {
            return;
        }
        Habit habit = habitRepository.findByIdAndUserIdForUpdate(habitId, userId)
                .orElseThrow(() -> ApiException.notFound("Habit was not found."));
        if (habit.getType() != HabitType.DURATION) {
            throw ApiException.validation("Only duration habits can be linked to focus sessions.",
                    Map.of("habitId", "The linked habit must have type DURATION."));
        }
        HabitEntry entry = entryRepository.findByHabitIdAndDateForUpdate(habitId, date).orElseGet(() -> {
            HabitEntry created = new HabitEntry();
            created.setHabit(habit);
            created.setDate(date);
            created.setValue(BigDecimal.ZERO);
            return created;
        });
        boolean before = entry.getValue().compareTo(habit.getTargetValue()) >= 0;
        entry.setValue(entry.getValue().add(BigDecimal.valueOf(minutes)));
        entryRepository.save(entry);
        boolean after = entry.getValue().compareTo(habit.getTargetValue()) >= 0;
        if (before != after) {
            metricService.habitCompletionDelta(habit.getUser(), date, after ? 1 : -1);
        }
    }

    public LocalDate today(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.unauthorized("User account no longer exists."));
        try {
            return clock.instant().atZone(ZoneId.of(user.getTimezone())).toLocalDate();
        } catch (DateTimeException ex) {
            return clock.instant().atZone(ZoneId.of("UTC")).toLocalDate();
        }
    }

    public ZoneId zone(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.unauthorized("User account no longer exists."));
        try {
            return ZoneId.of(user.getTimezone());
        } catch (DateTimeException ex) {
            return ZoneId.of("UTC");
        }
    }

    private Habit require(UUID userId, UUID habitId) {
        return habitRepository.findByIdAndUserId(habitId, userId)
                .orElseThrow(() -> ApiException.notFound("Habit was not found."));
    }

    private Habit requireForUpdate(UUID userId, UUID habitId) {
        return habitRepository.findByIdAndUserIdForUpdate(habitId, userId)
                .orElseThrow(() -> ApiException.notFound("Habit was not found."));
    }

    private void apply(Habit habit, HabitRequest request) {
        if (request.scheduleType() == ScheduleType.WEEKDAYS) {
            if (request.weekdays() == null || request.weekdays().isEmpty()
                    || request.weekdays().stream().anyMatch(day -> day == null || day < 1 || day > 7)
                    || request.weekdays().size() != new HashSet<>(request.weekdays()).size()) {
                throw ApiException.validation("Weekdays are invalid.", Map.of("weekdays", "Use unique ISO weekdays from 1 to 7."));
            }
        }
        if (request.scheduleType() == ScheduleType.TIMES_PER_WEEK
                && (request.timesPerWeek() == null || request.timesPerWeek() < 1 || request.timesPerWeek() > 7)) {
            throw ApiException.validation("Times per week is invalid.", Map.of("timesPerWeek", "Use a value from 1 to 7."));
        }
        if (request.scheduleType() == ScheduleType.INTERVAL
                && (request.intervalDays() == null || request.intervalDays() < 2 || request.intervalDays() > 30
                        || request.scheduleStartDate() == null)) {
            throw ApiException.validation("Interval schedule is invalid.",
                    Map.of("intervalDays", "Use 2-30 and provide scheduleStartDate."));
        }
        if (request.type() == HabitType.BOOLEAN && request.targetValue().compareTo(BigDecimal.ONE) != 0) {
            throw ApiException.validation("Boolean habits target one completion.", Map.of("targetValue", "Use 1 for BOOLEAN habits."));
        }
        String color = request.color() == null || request.color().isBlank() ? "moss" : request.color().trim().toLowerCase();
        if (!ALLOWED_COLORS.contains(color)) {
            throw ApiException.validation("Color is not supported.", Map.of("color", "Choose one of the supported habit colors."));
        }

        habit.setName(request.name().trim());
        habit.setDescription(blankToNull(request.description()));
        habit.setType(request.type());
        habit.setTargetValue(request.targetValue());
        habit.setUnit(request.unit() == null || request.unit().isBlank() ? defaultUnit(request.type()) : request.unit().trim());
        habit.setScheduleType(request.scheduleType());
        habit.setWeekdays(request.scheduleType() == ScheduleType.WEEKDAYS
                ? request.weekdays().stream().sorted().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse(null)
                : null);
        habit.setTimesPerWeek(request.scheduleType() == ScheduleType.TIMES_PER_WEEK ? request.timesPerWeek() : null);
        habit.setIntervalDays(request.scheduleType() == ScheduleType.INTERVAL ? request.intervalDays() : null);
        habit.setScheduleStartDate(request.scheduleType() == ScheduleType.INTERVAL ? request.scheduleStartDate() : null);
        habit.setReminderTime(request.reminderTime());
        habit.setColor(color);
    }

    private String defaultUnit(HabitType type) {
        return type == HabitType.DURATION ? "minutes" : type == HabitType.COUNT ? "count" : "done";
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
