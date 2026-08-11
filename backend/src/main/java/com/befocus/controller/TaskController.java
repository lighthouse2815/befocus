package com.befocus.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.befocus.dto.request.TaskRequest;
import com.befocus.dto.response.TaskResponse;
import com.befocus.security.CurrentUser;
import com.befocus.service.TaskService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {
    private final TaskService taskService;
    private final CurrentUser currentUser;

    public TaskController(TaskService taskService, CurrentUser currentUser) {
        this.taskService = taskService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @Operation(summary = "List tasks")
    public List<TaskResponse> list(@RequestParam(required = false) UUID projectId) {
        return taskService.list(currentUser.id(), projectId);
    }

    @PostMapping
    @Operation(summary = "Create a task")
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(currentUser.id(), request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Edit a task")
    public TaskResponse update(@PathVariable UUID id, @Valid @RequestBody TaskRequest request) {
        return taskService.update(currentUser.id(), id, request);
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Complete a task")
    public TaskResponse complete(@PathVariable UUID id) {
        return taskService.complete(currentUser.id(), id);
    }
}
