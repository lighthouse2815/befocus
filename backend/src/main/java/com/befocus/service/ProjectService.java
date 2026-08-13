package com.befocus.service;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.ProjectRequest;
import com.befocus.dto.response.FocusSessionResponse;
import com.befocus.dto.response.ProjectResponse;
import com.befocus.dto.response.TaskResponse;
import com.befocus.dto.response.WeeklyActivityPoint;
import com.befocus.entity.FocusSession;
import com.befocus.entity.FocusStatus;
import com.befocus.entity.Project;
import com.befocus.entity.TaskStatus;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.mapper.FocusMapper;
import com.befocus.repository.FocusSessionRepository;
import com.befocus.repository.ProjectRepository;
import com.befocus.repository.TaskRepository;
import com.befocus.repository.UserRepository;

@Service
public class ProjectService {
    private static final Set<String> ALLOWED_COLORS = Set.of("moss", "clay", "amber", "ocean", "plum", "ink");
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final FocusSessionRepository focusSessionRepository;
    private final UserRepository userRepository;
    private final FocusMapper focusMapper;
    private final Clock clock;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository,
            FocusSessionRepository focusSessionRepository, UserRepository userRepository, FocusMapper focusMapper,
            Clock clock) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.focusSessionRepository = focusSessionRepository;
        this.userRepository = userRepository;
        this.focusMapper = focusMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(UUID userId, boolean includeArchived) {
        List<Project> projects = new ArrayList<>(projectRepository.findAllByUserIdAndArchivedAtIsNullOrderByCreatedAtDesc(userId));
        if (includeArchived) {
            projects.addAll(projectRepository.findAllByUserIdAndArchivedAtIsNotNullOrderByArchivedAtDesc(userId));
        }
        if (projects.isEmpty()) {
            return List.of();
        }
        List<UUID> projectIds = projects.stream().map(Project::getId).toList();
        Map<UUID, Map<TaskStatus, Long>> taskCounts = new HashMap<>();
        for (TaskRepository.ProjectTaskCount item : taskRepository.countByProjectIds(userId, projectIds)) {
            taskCounts.computeIfAbsent(item.getProjectId(), ignored -> new HashMap<>())
                    .put(item.getStatus(), item.getTotal());
        }
        Map<UUID, Long> focusMinutes = focusSessionRepository
                .sumMinutesByProjectIds(userId, FocusStatus.COMPLETED, projectIds).stream()
                .collect(Collectors.toMap(FocusSessionRepository.ProjectFocusMinutes::getProjectId,
                        FocusSessionRepository.ProjectFocusMinutes::getMinutes));
        return projects.stream().map(project -> {
            Map<TaskStatus, Long> counts = taskCounts.getOrDefault(project.getId(), Map.of());
            return summary(project, safeMinutes(focusMinutes.getOrDefault(project.getId(), 0L)),
                    counts.getOrDefault(TaskStatus.COMPLETED, 0L), counts.getOrDefault(TaskStatus.PENDING, 0L));
        }).toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(UUID userId, UUID projectId) {
        return detail(userId, require(userId, projectId));
    }

    @Transactional
    public ProjectResponse create(UUID userId, ProjectRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản người dùng không còn tồn tại."));
        Project project = new Project();
        project.setUser(user);
        apply(project, request);
        return detail(userId, projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse update(UUID userId, UUID projectId, ProjectRequest request) {
        Project project = requireForUpdate(userId, projectId);
        if (project.isArchived()) {
            throw ApiException.invalidState("Không thể chỉnh sửa dự án đã lưu trữ.");
        }
        apply(project, request);
        return detail(userId, projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse archive(UUID userId, UUID projectId) {
        Project project = requireForUpdate(userId, projectId);
        if (!project.isArchived()) {
            project.setArchivedAt(clock.instant());
            projectRepository.save(project);
        }
        return summary(userId, project);
    }

    public Project require(UUID userId, UUID projectId) {
        return projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy dự án."));
    }

    public Project requireActive(UUID userId, UUID projectId) {
        Project project = require(userId, projectId);
        if (project.isArchived()) {
            throw ApiException.validation("Không thể thêm công việc vào dự án đã lưu trữ.",
                    Map.of("projectId", "Hãy chọn một dự án đang hoạt động."));
        }
        return project;
    }

    private Project requireForUpdate(UUID userId, UUID projectId) {
        return projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy dự án."));
    }

    private void apply(Project project, ProjectRequest request) {
        String color = normalize(request.color());
        if (color == null) {
            color = project.getColor() == null ? "ink" : project.getColor();
        }
        if (!ALLOWED_COLORS.contains(color)) {
            throw ApiException.validation("Màu dự án không hợp lệ.",
                    Map.of("color", "Hãy chọn một trong các màu được hỗ trợ."));
        }
        project.setName(request.name().trim());
        project.setDescription(normalize(request.description()));
        project.setColor(color);
        project.setIcon(normalize(request.icon()));
    }

    private ProjectResponse summary(UUID userId, Project project) {
        long completedTasks = taskRepository.countByUserIdAndProjectIdAndStatus(userId, project.getId(), TaskStatus.COMPLETED);
        long pendingTasks = taskRepository.countByUserIdAndProjectIdAndStatus(userId, project.getId(), TaskStatus.PENDING);
        int total = totalMinutes(focusSessionRepository.findAllByUserIdAndProjectIdAndStatusOrderByCompletedAtDesc(
                userId, project.getId(), FocusStatus.COMPLETED));
        return summary(project, total, completedTasks, pendingTasks);
    }

    private ProjectResponse summary(Project project, int total, long completedTasks, long pendingTasks) {
        return new ProjectResponse(project.getId(), project.getName(), project.getDescription(), project.getColor(),
                project.getIcon(), project.getArchivedAt(), project.isArchived(), total, completedTasks, pendingTasks,
                List.of(), List.of(), List.of());
    }

    private ProjectResponse detail(UUID userId, Project project) {
        List<com.befocus.entity.Task> taskEntities = taskRepository
                .findAllByUserIdAndProjectIdOrderByStatusAscDueDateAscCreatedAtAsc(userId, project.getId());
        Map<UUID, Long> taskMinutes = taskEntities.isEmpty() ? Map.of()
                : focusSessionRepository.sumMinutesByTaskIds(userId, FocusStatus.COMPLETED,
                        taskEntities.stream().map(com.befocus.entity.Task::getId).toList()).stream()
                        .collect(Collectors.toMap(FocusSessionRepository.TaskFocusMinutes::getTaskId,
                                FocusSessionRepository.TaskFocusMinutes::getMinutes));
        List<TaskResponse> tasks = taskEntities.stream()
                .map(task -> taskResponse(task, safeMinutes(taskMinutes.getOrDefault(task.getId(), 0L))))
                .toList();
        List<FocusSessionResponse> recent = focusMapper.toResponses(focusSessionRepository
                .findTop10ByUserIdAndProjectIdOrderByCreatedAtDesc(userId, project.getId()));
        List<FocusSession> completed = focusSessionRepository.findAllByUserIdAndProjectIdAndStatusOrderByCompletedAtDesc(
                userId, project.getId(), FocusStatus.COMPLETED);
        int total = totalMinutes(completed);
        List<WeeklyActivityPoint> weekly = weeklyActivity(userId, completed);
        long completedTasks = tasks.stream().filter(TaskResponse::completed).count();
        long pendingTasks = tasks.size() - completedTasks;
        return new ProjectResponse(project.getId(), project.getName(), project.getDescription(), project.getColor(),
                project.getIcon(), project.getArchivedAt(), project.isArchived(), total, completedTasks, pendingTasks,
                tasks, recent, weekly);
    }

    private TaskResponse taskResponse(com.befocus.entity.Task task, int minutes) {
        return new TaskResponse(task.getId(), task.getProject().getId(), task.getProject().getName(), task.getTitle(),
                task.getDescription(), task.getDueDate(), task.getStatus(), task.getStatus() == TaskStatus.COMPLETED,
                task.getCompletedAt(), minutes);
    }

    private int totalMinutes(List<FocusSession> sessions) {
        return sessions.stream().mapToInt(session -> session.getActualDurationMinutes() == null ? 0
                : session.getActualDurationMinutes()).sum();
    }

    private int safeMinutes(long minutes) {
        return (int) Math.min(Integer.MAX_VALUE, Math.max(0, minutes));
    }

    private List<WeeklyActivityPoint> weeklyActivity(UUID userId, List<FocusSession> completed) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản người dùng không còn tồn tại."));
        ZoneId zone = zone(user);
        LocalDate today = clock.instant().atZone(zone).toLocalDate();
        Map<LocalDate, Integer> values = new HashMap<>();
        for (FocusSession session : completed) {
            if (session.getCompletedAt() != null) {
                LocalDate date = session.getCompletedAt().atZone(zone).toLocalDate();
                if (!date.isBefore(today.minusDays(6)) && !date.isAfter(today)) {
                    values.merge(date, session.getActualDurationMinutes() == null ? 0 : session.getActualDurationMinutes(), Integer::sum);
                }
            }
        }
        List<WeeklyActivityPoint> result = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            result.add(new WeeklyActivityPoint(date, values.getOrDefault(date, 0)));
        }
        return result;
    }

    private ZoneId zone(User user) {
        try {
            return ZoneId.of(user.getTimezone());
        } catch (DateTimeException ex) {
            return ZoneId.of("UTC");
        }
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
