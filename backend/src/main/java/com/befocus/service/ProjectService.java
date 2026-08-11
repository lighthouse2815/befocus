package com.befocus.service;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

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
        return projects.stream().map(project -> summary(userId, project)).toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(UUID userId, UUID projectId) {
        return detail(userId, require(userId, projectId));
    }

    @Transactional
    public ProjectResponse create(UUID userId, ProjectRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("User account no longer exists."));
        Project project = new Project();
        project.setUser(user);
        apply(project, request);
        return detail(userId, projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse update(UUID userId, UUID projectId, ProjectRequest request) {
        Project project = requireForUpdate(userId, projectId);
        if (project.isArchived()) {
            throw ApiException.invalidState("Archived projects cannot be edited.");
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
                .orElseThrow(() -> ApiException.notFound("Project was not found."));
    }

    public Project requireActive(UUID userId, UUID projectId) {
        Project project = require(userId, projectId);
        if (project.isArchived()) {
            throw ApiException.validation("Archived projects cannot receive new tasks.",
                    Map.of("projectId", "Choose an active project."));
        }
        return project;
    }

    private Project requireForUpdate(UUID userId, UUID projectId) {
        return projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Project was not found."));
    }

    private void apply(Project project, ProjectRequest request) {
        String color = normalize(request.color());
        if (color == null) {
            color = project.getColor() == null ? "ink" : project.getColor();
        }
        if (!ALLOWED_COLORS.contains(color)) {
            throw ApiException.validation("Project color is invalid.",
                    Map.of("color", "Use one of moss, clay, amber, ocean, plum, or ink."));
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
        return new ProjectResponse(project.getId(), project.getName(), project.getDescription(), project.getColor(),
                project.getIcon(), project.getArchivedAt(), project.isArchived(), total, completedTasks, pendingTasks,
                List.of(), List.of(), List.of());
    }

    private ProjectResponse detail(UUID userId, Project project) {
        List<TaskResponse> tasks = taskRepository.findAllByUserIdAndProjectIdOrderByStatusAscDueDateAscCreatedAtAsc(userId,
                project.getId()).stream().map(task -> taskResponse(task, userId)).toList();
        List<FocusSessionResponse> recent = focusSessionRepository.findTop10ByUserIdAndProjectIdOrderByCreatedAtDesc(userId,
                project.getId()).stream().map(focusMapper::toResponse).toList();
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

    private TaskResponse taskResponse(com.befocus.entity.Task task, UUID userId) {
        int minutes = totalMinutes(focusSessionRepository.findAllByUserIdAndTaskIdAndStatusOrderByCompletedAtDesc(userId,
                task.getId(), FocusStatus.COMPLETED));
        return new TaskResponse(task.getId(), task.getProject().getId(), task.getProject().getName(), task.getTitle(),
                task.getDescription(), task.getDueDate(), task.getStatus(), task.getStatus() == TaskStatus.COMPLETED,
                task.getCompletedAt(), minutes);
    }

    private int totalMinutes(List<FocusSession> sessions) {
        return sessions.stream().mapToInt(session -> session.getActualDurationMinutes() == null ? 0
                : session.getActualDurationMinutes()).sum();
    }

    private List<WeeklyActivityPoint> weeklyActivity(UUID userId, List<FocusSession> completed) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("User account no longer exists."));
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
