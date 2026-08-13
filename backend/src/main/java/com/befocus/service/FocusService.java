package com.befocus.service;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.FocusInterruptionRequest;
import com.befocus.dto.request.FocusStartRequest;
import com.befocus.dto.response.FocusInterruptionResponse;
import com.befocus.dto.response.FocusSessionResponse;
import com.befocus.entity.FocusInterruption;
import com.befocus.entity.FocusSession;
import com.befocus.entity.FocusStatus;
import com.befocus.entity.Habit;
import com.befocus.entity.HabitType;
import com.befocus.entity.Project;
import com.befocus.entity.Task;
import com.befocus.entity.TaskStatus;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.mapper.FocusMapper;
import com.befocus.repository.FocusInterruptionRepository;
import com.befocus.repository.FocusSessionRepository;
import com.befocus.repository.HabitRepository;
import com.befocus.repository.ProjectRepository;
import com.befocus.repository.TaskRepository;
import com.befocus.repository.UserRepository;

@Service
public class FocusService {
    private static final List<FocusStatus> ACTIVE_STATUSES = List.of(FocusStatus.RUNNING, FocusStatus.PAUSED);

    private final FocusSessionRepository sessionRepository;
    private final FocusInterruptionRepository interruptionRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final HabitRepository habitRepository;
    private final HabitScheduleService scheduleService;
    private final HabitService habitService;
    private final MetricService metricService;
    private final FocusMapper mapper;
    private final Clock clock;

    public FocusService(
            FocusSessionRepository sessionRepository,
            FocusInterruptionRepository interruptionRepository,
            UserRepository userRepository,
            ProjectRepository projectRepository,
            TaskRepository taskRepository,
            HabitRepository habitRepository,
            HabitScheduleService scheduleService,
            HabitService habitService,
            MetricService metricService,
            FocusMapper mapper,
            Clock clock) {
        this.sessionRepository = sessionRepository;
        this.interruptionRepository = interruptionRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.habitRepository = habitRepository;
        this.scheduleService = scheduleService;
        this.habitService = habitService;
        this.metricService = metricService;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional
    public FocusSessionResponse start(UUID userId, FocusStartRequest request) {
        User user = lockUser(userId);
        if (!sessionRepository.findActiveByUser(userId, ACTIVE_STATUSES).isEmpty()) {
            throw ApiException.conflict("Bạn đang có một phiên tập trung chưa kết thúc.");
        }

        Instant now = clock.instant();
        Project project = request.projectId() == null ? null : requireProject(userId, request.projectId());
        Task task = request.taskId() == null ? null : requireTask(userId, request.taskId());
        if (task != null) {
            if (task.getStatus() == TaskStatus.COMPLETED) {
                throw ApiException.validation("Không thể thêm phiên tập trung cho công việc đã hoàn thành.",
                        Map.of("taskId", "Hãy chọn một công việc đang mở."));
            }
            if (task.getProject().isArchived()) {
                throw ApiException.validation("Không thể thêm phiên tập trung cho công việc thuộc dự án đã lưu trữ.",
                        Map.of("taskId", "Hãy chọn công việc thuộc một dự án đang hoạt động."));
            }
            if (project != null && !project.getId().equals(task.getProject().getId())) {
                throw ApiException.validation("Công việc đã chọn không thuộc dự án đã chọn.",
                        Map.of("taskId", "Hãy chọn công việc thuộc dự án đã chọn."));
            }
            project = task.getProject();
        }

        Habit habit = request.habitId() == null ? null : requireLinkableHabit(user, request.habitId(), now);

        FocusSession session = new FocusSession();
        session.setUser(user);
        session.setProject(project);
        session.setTask(task);
        session.setHabit(habit);
        session.setStatus(FocusStatus.RUNNING);
        session.setPlannedDurationMinutes(request.plannedDurationMinutes());
        session.setStartedAt(now);
        session.setExpectedEndAt(now.plus(Duration.ofMinutes(request.plannedDurationMinutes())));
        session.setTotalPausedSeconds(0);
        return mapper.toResponse(sessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public FocusSessionResponse active(UUID userId) {
        return sessionRepository.findActiveByUser(userId, ACTIVE_STATUSES)
                .stream()
                .findFirst()
                .map(mapper::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<FocusSessionResponse> recent(UUID userId, int limit) {
        return mapper.toResponses(sessionRepository.findAllByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, limit)));
    }

    @Transactional
    public FocusSessionResponse pause(UUID userId, UUID sessionId) {
        FocusSession session = requireForUpdate(userId, sessionId);
        if (session.getStatus() != FocusStatus.RUNNING) {
            throw ApiException.invalidState("Chỉ có thể tạm dừng phiên tập trung đang chạy.");
        }
        Instant now = clock.instant();
        if (!now.isBefore(session.getExpectedEndAt())) {
            throw ApiException.invalidState("Phiên tập trung đã đủ thời lượng dự kiến. Hãy hoàn thành phiên.");
        }
        session.setStatus(FocusStatus.PAUSED);
        session.setPausedAt(now);
        return mapper.toResponse(sessionRepository.save(session));
    }

    @Transactional
    public FocusSessionResponse resume(UUID userId, UUID sessionId) {
        FocusSession session = requireForUpdate(userId, sessionId);
        if (session.getStatus() != FocusStatus.PAUSED || session.getPausedAt() == null) {
            throw ApiException.invalidState("Chỉ có thể tiếp tục phiên tập trung đang tạm dừng.");
        }
        finishPause(session, clock.instant(), true);
        session.setStatus(FocusStatus.RUNNING);
        return mapper.toResponse(sessionRepository.save(session));
    }

    @Transactional
    public FocusSessionResponse complete(UUID userId, UUID sessionId) {
        FocusSession session = requireForUpdate(userId, sessionId);
        if (session.getStatus() == FocusStatus.COMPLETED) {
            return mapper.toResponse(session);
        }
        if (session.getStatus() == FocusStatus.CANCELLED || !ACTIVE_STATUSES.contains(session.getStatus())) {
            throw ApiException.invalidState("Chỉ có thể hoàn thành một phiên tập trung đang hoạt động.");
        }

        Instant now = clock.instant();
        int actualMinutes = actualMinutes(session, now);
        if (session.getStatus() == FocusStatus.PAUSED) {
            finishPause(session, now, false);
        }
        session.setStatus(FocusStatus.COMPLETED);
        session.setActualDurationMinutes(actualMinutes);
        session.setCompletedAt(now);
        sessionRepository.save(session);

        LocalDate completionDate = localDate(session.getUser(), now);
        if (session.getHabit() != null && actualMinutes > 0) {
            LocalDate habitDate = localDate(session.getUser(), session.getStartedAt());
            habitService.addDurationFromFocus(userId, session.getHabit().getId(), habitDate, actualMinutes);
        }
        metricService.focusCompleted(session.getUser(), completionDate, actualMinutes);
        return mapper.toResponse(session);
    }

    @Transactional
    public FocusSessionResponse cancel(UUID userId, UUID sessionId) {
        FocusSession session = requireForUpdate(userId, sessionId);
        if (session.getStatus() == FocusStatus.CANCELLED) {
            return mapper.toResponse(session);
        }
        if (session.getStatus() == FocusStatus.COMPLETED || !ACTIVE_STATUSES.contains(session.getStatus())) {
            throw ApiException.invalidState("Chỉ có thể hủy một phiên tập trung đang hoạt động.");
        }

        Instant now = clock.instant();
        int actualMinutes = actualMinutes(session, now);
        if (session.getStatus() == FocusStatus.PAUSED) {
            finishPause(session, now, false);
        }
        session.setStatus(FocusStatus.CANCELLED);
        session.setActualDurationMinutes(actualMinutes);
        session.setCancelledAt(now);
        sessionRepository.save(session);
        metricService.focusCancelled(session.getUser(), localDate(session.getUser(), now));
        return mapper.toResponse(session);
    }

    @Transactional
    public FocusInterruptionResponse addInterruption(
            UUID userId,
            UUID sessionId,
            FocusInterruptionRequest request) {
        FocusSession session = requireForUpdate(userId, sessionId);
        if (!ACTIVE_STATUSES.contains(session.getStatus())) {
            throw ApiException.invalidState("Chỉ có thể ghi gián đoạn trong một phiên tập trung đang hoạt động.");
        }

        Instant now = clock.instant();
        FocusInterruption interruption = new FocusInterruption();
        interruption.setFocusSession(session);
        interruption.setKind(request.kind());
        interruption.setNote(normalize(request.note()));
        interruption.setOccurredAt(now);
        FocusInterruption saved = interruptionRepository.save(interruption);
        metricService.interruption(session.getUser(), localDate(session.getUser(), now));
        return mapper.toResponse(saved);
    }

    private User lockUser(UUID userId) {
        return userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản người dùng không còn tồn tại."));
    }

    private FocusSession requireForUpdate(UUID userId, UUID sessionId) {
        return sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phiên tập trung."));
    }

    private Project requireProject(UUID userId, UUID projectId) {
        Project project = projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy dự án."));
        if (project.isArchived()) {
            throw ApiException.validation("Không thể thêm phiên tập trung cho dự án đã lưu trữ.",
                    Map.of("projectId", "Hãy chọn một dự án đang hoạt động."));
        }
        return project;
    }

    private Task requireTask(UUID userId, UUID taskId) {
        return taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy công việc."));
    }

    private Habit requireLinkableHabit(User user, UUID habitId, Instant startedAt) {
        Habit habit = habitRepository.findByIdAndUserId(habitId, user.getId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thói quen."));
        if (habit.isArchived()) {
            throw ApiException.validation("Không thể ghi tiến độ tập trung cho thói quen đã lưu trữ.",
                    Map.of("habitId", "Hãy chọn một thói quen thời lượng đang hoạt động."));
        }
        if (habit.getType() != HabitType.DURATION) {
            throw ApiException.validation("Chỉ có thể liên kết thói quen thời lượng với phiên tập trung.",
                    Map.of("habitId", "Hãy chọn một thói quen được đo bằng thời lượng."));
        }
        if (!scheduleService.isScheduledOn(habit, localDate(user, startedAt))) {
            throw ApiException.validation("Thói quen được liên kết không có lịch hôm nay.",
                    Map.of("habitId", "Hãy chọn một thói quen thời lượng có lịch hôm nay."));
        }
        return habit;
    }

    private void finishPause(FocusSession session, Instant now, boolean extendExpectedEnd) {
        long pausedSeconds = Math.max(0, Duration.between(session.getPausedAt(), now).getSeconds());
        session.setTotalPausedSeconds(session.getTotalPausedSeconds() + pausedSeconds);
        if (extendExpectedEnd) {
            session.setExpectedEndAt(session.getExpectedEndAt().plusSeconds(pausedSeconds));
        }
        session.setPausedAt(null);
    }

    private int actualMinutes(FocusSession session, Instant now) {
        Instant effectiveEnd = session.getStatus() == FocusStatus.PAUSED && session.getPausedAt() != null
                ? session.getPausedAt()
                : now;
        long elapsedSeconds = Math.max(0, Duration.between(session.getStartedAt(), effectiveEnd).getSeconds());
        long activeSeconds = Math.max(0, elapsedSeconds - session.getTotalPausedSeconds());
        long roundedMinutes = activeSeconds == 0 ? 0 : (activeSeconds + 59) / 60;
        return (int) Math.min(session.getPlannedDurationMinutes(), roundedMinutes);
    }

    private LocalDate localDate(User user, Instant instant) {
        return instant.atZone(zone(user)).toLocalDate();
    }

    private ZoneId zone(User user) {
        try {
            return ZoneId.of(user.getTimezone());
        } catch (DateTimeException ex) {
            return ZoneId.of("UTC");
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
