package com.befocus.config;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.entity.FocusInterruption;
import com.befocus.entity.FocusSession;
import com.befocus.entity.FocusStatus;
import com.befocus.entity.Habit;
import com.befocus.entity.HabitEntry;
import com.befocus.entity.HabitType;
import com.befocus.entity.InterruptionKind;
import com.befocus.entity.NotificationPreference;
import com.befocus.entity.Project;
import com.befocus.entity.ScheduleType;
import com.befocus.entity.Task;
import com.befocus.entity.TaskStatus;
import com.befocus.entity.User;
import com.befocus.repository.FocusInterruptionRepository;
import com.befocus.repository.FocusSessionRepository;
import com.befocus.repository.HabitEntryRepository;
import com.befocus.repository.HabitRepository;
import com.befocus.repository.NotificationPreferenceRepository;
import com.befocus.repository.ProjectRepository;
import com.befocus.repository.TaskRepository;
import com.befocus.repository.UserRepository;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true")
public class DevelopmentSeedConfig implements ApplicationRunner {
    public static final String DEMO_EMAIL = "demo@befocus.local";
    private static final Logger log = LoggerFactory.getLogger(DevelopmentSeedConfig.class);
    private static final ZoneId DEMO_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final UserRepository userRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final HabitRepository habitRepository;
    private final HabitEntryRepository entryRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final FocusSessionRepository sessionRepository;
    private final FocusInterruptionRepository interruptionRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public DevelopmentSeedConfig(UserRepository userRepository,
            NotificationPreferenceRepository preferenceRepository, HabitRepository habitRepository,
            HabitEntryRepository entryRepository, ProjectRepository projectRepository, TaskRepository taskRepository,
            FocusSessionRepository sessionRepository, FocusInterruptionRepository interruptionRepository,
            PasswordEncoder passwordEncoder, Clock clock) {
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
        this.habitRepository = habitRepository;
        this.entryRepository = entryRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.sessionRepository = sessionRepository;
        this.interruptionRepository = interruptionRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByEmailIgnoreCase(DEMO_EMAIL)) {
            log.info("Development seed already exists; no records were added.");
            return;
        }

        Instant now = clock.instant();
        LocalDate today = now.atZone(DEMO_ZONE).toLocalDate();
        User user = new User();
        user.setName("Minh An");
        user.setEmail(DEMO_EMAIL);
        user.setPasswordHash(passwordEncoder.encode("BeFocusDemo2026!"));
        user.setTimezone(DEMO_ZONE.getId());
        user.setDefaultFocusMinutes(25);
        user.setDefaultBreakMinutes(5);
        user.setLongBreakMinutes(15);
        user.setSessionsBeforeLongBreak(4);
        user = userRepository.save(user);

        NotificationPreference preference = new NotificationPreference();
        preference.setUser(user);
        preference.setEnabled(true);
        preference.setBrowserEnabled(false);
        preference.setInAppEnabled(true);
        preferenceRepository.save(preference);

        Habit english = habit(user, "Học tiếng Anh", "Tập trung đủ 60 phút mỗi ngày.", HabitType.DURATION,
                new BigDecimal("60"), "phút", ScheduleType.DAILY, "ocean", LocalTime.of(8, 0));
        Habit reading = habit(user, "Đọc sách", "Đọc chậm và ghi lại điều đáng nhớ.", HabitType.COUNT,
                new BigDecimal("20"), "trang", ScheduleType.WEEKDAYS, "amber", LocalTime.of(21, 0));
        reading.setWeekdays("1,2,3,4,5");
        Habit vitamin = habit(user, "Uống vitamin", null, HabitType.BOOLEAN, BigDecimal.ONE, "lần",
                ScheduleType.DAILY, "moss", LocalTime.of(7, 30));
        habitRepository.saveAll(List.of(english, reading, vitamin));

        for (int offset = 6; offset >= 1; offset--) {
            LocalDate date = today.minusDays(offset);
            entryRepository.save(entry(english, date, BigDecimal.valueOf(offset % 3 == 0 ? 45 : 60), "Dữ liệu demo"));
            entryRepository.save(entry(vitamin, date, BigDecimal.ONE, null));
            if (date.getDayOfWeek().getValue() <= 5) {
                entryRepository.save(entry(reading, date, BigDecimal.valueOf(offset % 2 == 0 ? 20 : 12), null));
            }
        }
        entryRepository.save(entry(english, today, BigDecimal.valueOf(60), "Tự động cộng từ hai phiên focus"));
        entryRepository.save(entry(vitamin, today, BigDecimal.ONE, null));

        Project project = new Project();
        project.setUser(user);
        project.setName("Ôn IELTS");
        project.setDescription("Chuẩn bị Reading và Writing theo từng phiên tập trung.");
        project.setColor("ocean");
        project.setIcon("✦");
        project = projectRepository.save(project);

        Task readingTask = task(user, project, "Luyện Reading passage", today, TaskStatus.PENDING);
        Task vocabularyTask = task(user, project, "Ôn từ vựng học thuật", today.minusDays(1), TaskStatus.COMPLETED);
        vocabularyTask.setCompletedAt(now.minus(Duration.ofDays(1)));
        taskRepository.saveAll(List.of(readingTask, vocabularyTask));

        FocusSession first = completedSession(user, project, readingTask, english, now.minus(Duration.ofMinutes(70)), 25);
        FocusSession second = completedSession(user, project, readingTask, english, now.minus(Duration.ofMinutes(25)), 35);
        FocusSession previous = completedSession(user, project, vocabularyTask, null, now.minus(Duration.ofDays(1)), 50);
        sessionRepository.saveAll(List.of(first, second, previous));

        FocusInterruption interruption = new FocusInterruption();
        interruption.setFocusSession(first);
        interruption.setKind(InterruptionKind.MESSAGE);
        interruption.setNote("Tin nhắn nhóm học");
        interruption.setOccurredAt(first.getStartedAt().plus(Duration.ofMinutes(12)));
        interruptionRepository.save(interruption);

        log.info("Development seed created for account {}.", DEMO_EMAIL);
    }

    private Habit habit(User user, String name, String description, HabitType type, BigDecimal target, String unit,
            ScheduleType scheduleType, String color, LocalTime reminder) {
        Habit habit = new Habit();
        habit.setUser(user);
        habit.setName(name);
        habit.setDescription(description);
        habit.setType(type);
        habit.setTargetValue(target);
        habit.setUnit(unit);
        habit.setScheduleType(scheduleType);
        habit.setColor(color);
        habit.setReminderTime(reminder);
        return habit;
    }

    private HabitEntry entry(Habit habit, LocalDate date, BigDecimal value, String note) {
        HabitEntry entry = new HabitEntry();
        entry.setHabit(habit);
        entry.setDate(date);
        entry.setValue(value);
        entry.setNote(note);
        return entry;
    }

    private Task task(User user, Project project, String title, LocalDate dueDate, TaskStatus status) {
        Task task = new Task();
        task.setUser(user);
        task.setProject(project);
        task.setTitle(title);
        task.setDueDate(dueDate);
        task.setStatus(status);
        return task;
    }

    private FocusSession completedSession(User user, Project project, Task task, Habit habit, Instant completedAt,
            int minutes) {
        FocusSession session = new FocusSession();
        session.setUser(user);
        session.setProject(project);
        session.setTask(task);
        session.setHabit(habit);
        session.setStatus(FocusStatus.COMPLETED);
        session.setPlannedDurationMinutes(minutes);
        session.setActualDurationMinutes(minutes);
        session.setStartedAt(completedAt.minus(Duration.ofMinutes(minutes)));
        session.setExpectedEndAt(completedAt);
        session.setCompletedAt(completedAt);
        session.setTotalPausedSeconds(0);
        return session;
    }
}
