package com.befocus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.BeFocusApplication;
import com.befocus.dto.request.HabitEntryRequest;
import com.befocus.dto.request.HabitRequest;
import com.befocus.dto.response.HabitResponse;
import com.befocus.entity.HabitType;
import com.befocus.entity.ScheduleType;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.exception.ErrorCode;
import com.befocus.repository.DailyMetricRepository;
import com.befocus.repository.HabitEntryRepository;
import com.befocus.repository.UserRepository;

@SpringBootTest(classes = { BeFocusApplication.class, HabitServiceIntegrationTest.FixedClockConfiguration.class })
@Transactional
class HabitServiceIntegrationTest {

    private static final Instant FIXED_NOW = Instant.parse("2026-08-11T17:30:00Z");

    @Autowired
    private HabitService habitService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HabitEntryRepository entryRepository;

    @Autowired
    private DailyMetricRepository dailyMetricRepository;

    @Test
    void createsCompletesReadsAndUndoesBooleanHabit() {
        User user = user("habit-flow@example.com", "Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.of(2026, 8, 12);
        HabitResponse created = habitService.create(user.getId(), request(
                "Uống vitamin", HabitType.BOOLEAN, BigDecimal.ONE, "lần", ScheduleType.DAILY, List.of()));

        assertThat(created.scheduledToday()).isTrue();
        assertThat(created.todayProgress()).isEqualByComparingTo(BigDecimal.ZERO);

        var entry = habitService.upsertEntry(user.getId(), created.id(), today,
                new HabitEntryRequest(BigDecimal.ONE, "  Sau bữa sáng  "));

        assertThat(entry.completed()).isTrue();
        assertThat(entry.note()).isEqualTo("Sau bữa sáng");

        HabitResponse completed = habitService.get(user.getId(), created.id(), today.minusDays(1), today);
        assertThat(completed.completedToday()).isTrue();
        assertThat(completed.currentStreak()).isEqualTo(1);
        assertThat(completed.entries()).hasSize(1);

        habitService.deleteEntry(user.getId(), created.id(), today);

        HabitResponse undone = habitService.get(user.getId(), created.id(), today, today);
        assertThat(undone.completedToday()).isFalse();
        assertThat(undone.todayProgress()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(undone.entries()).isEmpty();
    }

    @Test
    void scopesEveryHabitLookupToTheAuthenticatedOwner() {
        User owner = user("owner@example.com", "UTC");
        User other = user("other@example.com", "UTC");
        HabitResponse habit = habitService.create(owner.getId(), request(
                "Private habit", HabitType.BOOLEAN, BigDecimal.ONE, "lần", ScheduleType.DAILY, List.of()));

        assertThatThrownBy(() -> habitService.get(other.getId(), habit.id(), null, null))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.NOT_FOUND));
        assertThatThrownBy(() -> habitService.delete(other.getId(), habit.id()))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void validatesScheduleBooleanValueAndArchivedLifecycle() {
        User user = user("validation@example.com", "Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.of(2026, 8, 12);
        HabitResponse habit = habitService.create(user.getId(), request(
                "Ngày giữa tuần", HabitType.BOOLEAN, BigDecimal.ONE, "lần",
                ScheduleType.WEEKDAYS, List.of(today.getDayOfWeek().getValue())));

        assertThatThrownBy(() -> habitService.upsertEntry(user.getId(), habit.id(), today.minusDays(1),
                new HabitEntryRequest(BigDecimal.ONE, null)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        assertThatThrownBy(() -> habitService.upsertEntry(user.getId(), habit.id(), today,
                new HabitEntryRequest(new BigDecimal("0.5"), null)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        assertThatThrownBy(() -> habitService.upsertEntry(user.getId(), habit.id(), today.plusDays(1),
                new HabitEntryRequest(BigDecimal.ONE, null)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));

        habitService.archive(user.getId(), habit.id());

        assertThat(habitService.list(user.getId(), false)).isEmpty();
        assertThat(habitService.list(user.getId(), true)).singleElement()
                .satisfies(item -> assertThat(item.archivedAt()).isNotNull());
        assertThatThrownBy(() -> habitService.upsertEntry(user.getId(), habit.id(), today,
                new HabitEntryRequest(BigDecimal.ONE, null)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.INVALID_STATE));
    }

    @Test
    void targetChangesAndDeletionKeepMaterializedMetricsConsistent() {
        User user = user("metrics@example.com", "Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.of(2026, 8, 12);
        HabitResponse habit = habitService.create(user.getId(), request(
                "Đọc sách", HabitType.COUNT, BigDecimal.TEN, "trang", ScheduleType.DAILY, List.of()));
        habitService.upsertEntry(user.getId(), habit.id(), today, new HabitEntryRequest(BigDecimal.TEN, null));

        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), today).orElseThrow()
                .getHabitCompletions()).isEqualTo(1);

        habitService.update(user.getId(), habit.id(), request(
                "Đọc sách", HabitType.COUNT, new BigDecimal("20"), "trang", ScheduleType.DAILY, List.of()));
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), today).orElseThrow()
                .getHabitCompletions()).isZero();

        habitService.update(user.getId(), habit.id(), request(
                "Đọc sách", HabitType.COUNT, new BigDecimal("5"), "trang", ScheduleType.DAILY, List.of()));
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), today).orElseThrow()
                .getHabitCompletions()).isEqualTo(1);

        habitService.delete(user.getId(), habit.id());
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), today).orElseThrow()
                .getHabitCompletions()).isZero();
    }

    @Test
    void linkedFocusMinutesAccumulateInOneDurationEntry() {
        User user = user("focus-link@example.com", "Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.of(2026, 8, 12);
        HabitResponse habit = habitService.create(user.getId(), request(
                "Học tiếng Anh", HabitType.DURATION, new BigDecimal("50"), "phút",
                ScheduleType.DAILY, List.of()));

        habitService.addDurationFromFocus(user.getId(), habit.id(), today, 25);
        habitService.addDurationFromFocus(user.getId(), habit.id(), today, 25);

        HabitResponse result = habitService.get(user.getId(), habit.id(), today, today);
        assertThat(result.todayProgress()).isEqualByComparingTo(new BigDecimal("50"));
        assertThat(result.completedToday()).isTrue();
        assertThat(entryRepository.findAllByHabitIdOrderByDateAsc(habit.id())).hasSize(1);
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), today).orElseThrow()
                .getHabitCompletions()).isEqualTo(1);
    }

    @Test
    void derivesLocalDateOnBothSidesOfMidnightFromTheSameUtcInstant() {
        User vietnam = user("vietnam@example.com", "Asia/Ho_Chi_Minh");
        User newYork = user("new-york@example.com", "America/New_York");

        assertThat(habitService.today(vietnam.getId())).isEqualTo(LocalDate.of(2026, 8, 12));
        assertThat(habitService.today(newYork.getId())).isEqualTo(LocalDate.of(2026, 8, 11));
    }

    private User user(String email, String timezone) {
        User user = new User();
        user.setName("Test User");
        user.setEmail(email);
        user.setPasswordHash("not-used-in-service-tests");
        user.setTimezone(timezone);
        return userRepository.saveAndFlush(user);
    }

    private HabitRequest request(String name, HabitType type, BigDecimal target, String unit,
            ScheduleType schedule, List<Integer> weekdays) {
        return new HabitRequest(name, null, type, target, unit, schedule,
                weekdays, null, null, null, null, "moss");
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedClockConfiguration {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        }
    }
}
