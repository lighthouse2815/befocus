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

import com.befocus.dto.request.ProjectRequest;
import com.befocus.dto.response.ProjectResponse;
import com.befocus.security.CurrentUser;
import com.befocus.service.ProjectService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final CurrentUser currentUser;

    public ProjectController(ProjectService projectService, CurrentUser currentUser) {
        this.projectService = projectService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @Operation(summary = "List the authenticated user's projects")
    public List<ProjectResponse> list(@RequestParam(defaultValue = "false") boolean includeArchived) {
        return projectService.list(currentUser.id(), includeArchived);
    }

    @PostMapping
    @Operation(summary = "Create a project")
    public ResponseEntity<ProjectResponse> create(@Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.create(currentUser.id(), request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a project with tasks and focus activity")
    public ProjectResponse get(@PathVariable UUID id) {
        return projectService.get(currentUser.id(), id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Rename or edit a project")
    public ProjectResponse update(@PathVariable UUID id, @Valid @RequestBody ProjectRequest request) {
        return projectService.update(currentUser.id(), id, request);
    }

    @PostMapping("/{id}/archive")
    @Operation(summary = "Archive a project")
    public ProjectResponse archive(@PathVariable UUID id) {
        return projectService.archive(currentUser.id(), id);
    }
}
