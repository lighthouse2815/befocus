package com.befocus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.BeFocusApplication;
import com.befocus.dto.request.FocusInterruptionRequest;
import com.befocus.dto.request.FocusStartRequest;
import com.befocus.dto.request.HabitRequest;
import com.befocus.dto.response.FocusSessionResponse;
import com.befocus.dto.response.HabitResponse;
import com.befocus.entity.FocusStatus;
import com.befocus.entity.HabitType;
import com.befocus.entity.InterruptionKind;
import com.befocus.entity.Project;
import com.befocus.entity.ScheduleType;
import com.befocus.entity.Task;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.exception.ErrorCode;
import com.befocus.repository.DailyMetricRepository;
import com.befocus.repository.ProjectRepository;
import com.befocus.repository.TaskRepository;
import com.befocus.repository.UserRepository;

@SpringBootTest(classes = { BeFocusApplication.class, FocusServiceIntegrationTest.ClockConfiguration.class })
@Transactional
class FocusServiceIntegrationTest {
    private static final Instant START = Instant.parse("2026-08-12T02:00:00Z");
    private static final LocalDate LOCAL_DATE = LocalDate.of(2026, 8, 12);

    @Autowired
    private FocusService focusService;

    @Autowired
    private HabitService habitService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private DailyMetricRepository dailyMetricRepository;

    @Autowired
    private MutableClock clock;

    @BeforeEach
    void resetClock() {
        clock.set(START);
    }

    @Test
    void persistsTimestampLifecycleAndUpdatesLinkedHabitExactlyOnce() {
        User user = user("focus-lifecycle@example.com", "Asia/Ho_Chi_Minh");
        HabitResponse habit = durationHabit(user, "Deep reading", new BigDecimal("25"), ScheduleType.DAILY, List.of());

        FocusSessionResponse started = focusService.start(user.getId(),
                new FocusStartRequest(25, null, null, habit.id()));

        assertThat(started.status()).isEqualTo(FocusStatus.RUNNING);
        assertThat(started.startedAt()).isEqualTo(START);
        assertThat(started.expectedEndAt()).isEqualTo(START.plus(Duration.ofMinutes(25)));
        assertThat(focusService.active(user.getId()).id()).isEqualTo(started.id());
        assertThatThrownBy(() -> focusService.start(user.getId(),
                new FocusStartRequest(25, null, null, habit.id())))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.CONFLICT));

        clock.advance(Duration.ofMinutes(5));
        FocusSessionResponse paused = focusService.pause(user.getId(), started.id());
        assertThat(paused.status()).isEqualTo(FocusStatus.PAUSED);
        assertThat(paused.pausedAt()).isEqualTo(START.plus(Duration.ofMinutes(5)));

        clock.advance(Duration.ofMinutes(3));
        FocusSessionResponse resumed = focusService.resume(user.getId(), started.id());
        assertThat(resumed.status()).isEqualTo(FocusStatus.RUNNING);
        assertThat(resumed.totalPausedSeconds()).isEqualTo(180);
        assertThat(resumed.expectedEndAt()).isEqualTo(START.plus(Duration.ofMinutes(28)));

        clock.advance(Duration.ofMinutes(20));
        FocusSessionResponse completed = focusService.complete(user.getId(), started.id());
        assertThat(completed.status()).isEqualTo(FocusStatus.COMPLETED);
        assertThat(completed.actualDurationMinutes()).isEqualTo(25);
        assertThat(focusService.active(user.getId())).isNull();

        HabitResponse linkedHabit = habitService.get(user.getId(), habit.id(), LOCAL_DATE, LOCAL_DATE);
        assertThat(linkedHabit.todayProgress()).isEqualByComparingTo(new BigDecimal("25"));
        assertThat(linkedHabit.completedToday()).isTrue();
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), LOCAL_DATE).orElseThrow())
                .satisfies(metric -> {
                    assertThat(metric.getFocusMinutes()).isEqualTo(25);
                    assertThat(metric.getCompletedSessions()).isEqualTo(1);
                    assertThat(metric.getHabitCompletions()).isEqualTo(1);
                });

        focusService.complete(user.getId(), started.id());
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), LOCAL_DATE).orElseThrow())
                .satisfies(metric -> {
                    assertThat(metric.getFocusMinutes()).isEqualTo(25);
                    assertThat(metric.getCompletedSessions()).isEqualTo(1);
                });
    }

    @Test
    void cancelIsIdempotentAndDoesNotCreditFocusOrHabitProgress() {
        User user = user("focus-cancel@example.com", "UTC");
        HabitResponse habit = durationHabit(user, "Practice", new BigDecimal("20"), ScheduleType.DAILY, List.of());
        FocusSessionResponse started = focusService.start(user.getId(),
                new FocusStartRequest(20, null, null, habit.id()));

        clock.advance(Duration.ofSeconds(245));
        FocusSessionResponse cancelled = focusService.cancel(user.getId(), started.id());

        assertThat(cancelled.status()).isEqualTo(FocusStatus.CANCELLED);
        assertThat(cancelled.actualDurationMinutes()).isEqualTo(5);
        assertThat(habitService.get(user.getId(), habit.id(), LOCAL_DATE, LOCAL_DATE).todayProgress())
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), LOCAL_DATE).orElseThrow())
                .satisfies(metric -> {
                    assertThat(metric.getCancelledSessions()).isEqualTo(1);
                    assertThat(metric.getFocusMinutes()).isZero();
                });

        focusService.cancel(user.getId(), started.id());
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), LOCAL_DATE).orElseThrow()
                .getCancelledSessions()).isEqualTo(1);
    }

    @Test
    void recordsNormalizedInterruptionsOnlyOnActiveSessions() {
        User user = user("focus-interruption@example.com", "UTC");
        FocusSessionResponse started = focusService.start(user.getId(),
                new FocusStartRequest(25, null, null, null));

        var interruption = focusService.addInterruption(user.getId(), started.id(),
                new FocusInterruptionRequest(InterruptionKind.PHONE, "  Unexpected call  "));

        assertThat(interruption.kind()).isEqualTo(InterruptionKind.PHONE);
        assertThat(interruption.note()).isEqualTo("Unexpected call");
        assertThat(dailyMetricRepository.findByUserIdAndMetricDate(user.getId(), LOCAL_DATE).orElseThrow()
                .getInterruptionCount()).isEqualTo(1);
        assertThat(focusService.active(user.getId()).interruptions()).hasSize(1);

        focusService.cancel(user.getId(), started.id());
        assertThatThrownBy(() -> focusService.addInterruption(user.getId(), started.id(),
                new FocusInterruptionRequest(InterruptionKind.NOISE, null)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.INVALID_STATE));
    }

    @Test
    void scopesSessionStateChangesToTheAuthenticatedOwner() {
        User owner = user("focus-owner@example.com", "UTC");
        User other = user("focus-other@example.com", "UTC");
        FocusSessionResponse session = focusService.start(owner.getId(),
                new FocusStartRequest(25, null, null, null));

        assertThat(focusService.active(other.getId())).isNull();
        assertThatThrownBy(() -> focusService.pause(other.getId(), session.id()))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void rejectsNonDurationArchivedAndUnscheduledHabitLinks() {
        User user = user("focus-habit-validation@example.com", "Asia/Ho_Chi_Minh");
        HabitResponse countHabit = habitService.create(user.getId(), habitRequest(
                "Read pages", HabitType.COUNT, BigDecimal.TEN, ScheduleType.DAILY, List.of()));

        assertThatThrownBy(() -> focusService.start(user.getId(),
                new FocusStartRequest(25, null, null, countHabit.id())))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));

        int tomorrow = LOCAL_DATE.plusDays(1).getDayOfWeek().getValue();
        HabitResponse unscheduled = durationHabit(user, "Weekend practice", BigDecimal.TEN,
                ScheduleType.WEEKDAYS, List.of(tomorrow));
        assertThatThrownBy(() -> focusService.start(user.getId(),
                new FocusStartRequest(25, null, null, unscheduled.id())))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));

        HabitResponse archived = durationHabit(user, "Archived practice", BigDecimal.TEN,
                ScheduleType.DAILY, List.of());
        habitService.archive(user.getId(), archived.id());
        assertThatThrownBy(() -> focusService.start(user.getId(),
                new FocusStartRequest(25, null, null, archived.id())))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void validatesTaskProjectCoherenceAndReturnsRecentSessionsNewestFirst() {
        User user = user("focus-project@example.com", "UTC");
        Project first = project(user, "First");
        Project second = project(user, "Second");
        Task task = task(user, first, "Read chapter");

        assertThatThrownBy(() -> focusService.start(user.getId(),
                new FocusStartRequest(25, second.getId(), task.getId(), null)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));

        FocusSessionResponse firstSession = focusService.start(user.getId(),
                new FocusStartRequest(25, null, task.getId(), null));
        assertThat(firstSession.projectId()).isEqualTo(first.getId());
        focusService.cancel(user.getId(), firstSession.id());

        clock.advance(Duration.ofMinutes(1));
        FocusSessionResponse secondSession = focusService.start(user.getId(),
                new FocusStartRequest(50, second.getId(), null, null));

        assertThat(focusService.recent(user.getId(), 2))
                .extracting(FocusSessionResponse::id)
                .containsExactly(secondSession.id(), firstSession.id());
    }

    private User user(String email, String timezone) {
        User user = new User();
        user.setName("Focus Tester");
        user.setEmail(email);
        user.setPasswordHash("not-used");
        user.setTimezone(timezone);
        return userRepository.saveAndFlush(user);
    }

    private HabitResponse durationHabit(User user, String name, BigDecimal target,
            ScheduleType scheduleType, List<Integer> weekdays) {
        return habitService.create(user.getId(),
                habitRequest(name, HabitType.DURATION, target, scheduleType, weekdays));
    }

    private HabitRequest habitRequest(String name, HabitType type, BigDecimal target,
            ScheduleType scheduleType, List<Integer> weekdays) {
        return new HabitRequest(name, null, type, target, type == HabitType.DURATION ? "minutes" : "pages",
                scheduleType, weekdays, null, null, null, null, "moss");
    }

    private Project project(User user, String name) {
        Project project = new Project();
        project.setUser(user);
        project.setName(name);
        return projectRepository.saveAndFlush(project);
    }

    private Task task(User user, Project project, String title) {
        Task task = new Task();
        task.setUser(user);
        task.setProject(project);
        task.setTitle(title);
        return taskRepository.saveAndFlush(task);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ClockConfiguration {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(START);
        }
    }

    static final class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void set(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
