package com.befocus.service;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.TaskRequest;
import com.befocus.dto.response.TaskResponse;
import com.befocus.entity.FocusSession;
import com.befocus.entity.FocusStatus;
import com.befocus.entity.Project;
import com.befocus.entity.Task;
import com.befocus.entity.TaskStatus;
import com.befocus.exception.ApiException;
import com.befocus.repository.FocusSessionRepository;
import com.befocus.repository.TaskRepository;

@Service
public class TaskService {
    private final TaskRepository taskRepository;
    private final FocusSessionRepository focusSessionRepository;
    private final ProjectService projectService;
    private final Clock clock;

    public TaskService(TaskRepository taskRepository, FocusSessionRepository focusSessionRepository,
            ProjectService projectService, Clock clock) {
        this.taskRepository = taskRepository;
        this.focusSessionRepository = focusSessionRepository;
        this.projectService = projectService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> list(UUID userId, UUID projectId) {
        List<Task> tasks = projectId == null
                ? taskRepository.findAllByUserIdOrderByStatusAscDueDateAscCreatedAtAsc(userId)
                : taskRepository.findAllByUserIdAndProjectIdOrderByStatusAscDueDateAscCreatedAtAsc(userId,
                        projectService.require(userId, projectId).getId());
        return tasks.stream().map(task -> toResponse(userId, task)).toList();
    }

    @Transactional
    public TaskResponse create(UUID userId, TaskRequest request) {
        Project project = projectService.requireActive(userId, request.projectId());
        Task task = new Task();
        task.setUser(project.getUser());
        task.setProject(project);
        apply(task, request);
        return toResponse(userId, taskRepository.save(task));
    }

    @Transactional
    public TaskResponse update(UUID userId, UUID taskId, TaskRequest request) {
        Task task = require(userId, taskId);
        Project project = projectService.requireActive(userId, request.projectId());
        task.setProject(project);
        apply(task, request);
        return toResponse(userId, taskRepository.save(task));
    }

    @Transactional
    public TaskResponse complete(UUID userId, UUID taskId) {
        Task task = require(userId, taskId);
        if (task.getStatus() != TaskStatus.COMPLETED) {
            task.setStatus(TaskStatus.COMPLETED);
            task.setCompletedAt(clock.instant());
            taskRepository.save(task);
        }
        return toResponse(userId, task);
    }

    private Task require(UUID userId, UUID taskId) {
        return taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> ApiException.notFound("Task was not found."));
    }

    private void apply(Task task, TaskRequest request) {
        task.setTitle(request.title().trim());
        task.setDescription(request.description() == null || request.description().isBlank() ? null : request.description().trim());
        task.setDueDate(request.dueDate());
    }

    private TaskResponse toResponse(UUID userId, Task task) {
        List<FocusSession> sessions = focusSessionRepository.findAllByUserIdAndTaskIdAndStatusOrderByCompletedAtDesc(userId,
                task.getId(), FocusStatus.COMPLETED);
        int minutes = sessions.stream().mapToInt(session -> session.getActualDurationMinutes() == null ? 0
                : session.getActualDurationMinutes()).sum();
        return new TaskResponse(task.getId(), task.getProject().getId(), task.getProject().getName(), task.getTitle(),
                task.getDescription(), task.getDueDate(), task.getStatus(), task.getStatus() == TaskStatus.COMPLETED,
                task.getCompletedAt(), minutes);
    }
}
