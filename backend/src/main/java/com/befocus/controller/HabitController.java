package com.befocus.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.befocus.dto.request.HabitEntryRequest;
import com.befocus.dto.request.HabitRequest;
import com.befocus.dto.response.HabitEntryResponse;
import com.befocus.dto.response.HabitResponse;
import com.befocus.security.CurrentUser;
import com.befocus.service.HabitService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/habits")
public class HabitController {
    private final HabitService habitService;
    private final CurrentUser currentUser;

    public HabitController(HabitService habitService, CurrentUser currentUser) {
        this.habitService = habitService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @Operation(summary = "List the authenticated user's habits")
    public List<HabitResponse> list(@RequestParam(defaultValue = "false") boolean includeArchived) {
        return habitService.list(currentUser.id(), includeArchived);
    }

    @PostMapping
    @Operation(summary = "Create a habit")
    public ResponseEntity<HabitResponse> create(@Valid @RequestBody HabitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(habitService.create(currentUser.id(), request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a habit and its progress")
    public HabitResponse get(@PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return habitService.get(currentUser.id(), id, from, to);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a habit")
    public HabitResponse update(@PathVariable UUID id, @Valid @RequestBody HabitRequest request) {
        return habitService.update(currentUser.id(), id, request);
    }

    @PostMapping("/{id}/archive")
    @Operation(summary = "Archive a habit")
    public ResponseEntity<Void> archive(@PathVariable UUID id) {
        habitService.archive(currentUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a habit")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        habitService.delete(currentUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/entries/{date}")
    @Operation(summary = "Create or update a local-date habit entry")
    public HabitEntryResponse upsertEntry(@PathVariable UUID id, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody HabitEntryRequest request) {
        return habitService.upsertEntry(currentUser.id(), id, date, request);
    }

    @DeleteMapping("/{id}/entries/{date}")
    @Operation(summary = "Undo a habit entry")
    public ResponseEntity<Void> deleteEntry(@PathVariable UUID id,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        habitService.deleteEntry(currentUser.id(), id, date);
        return ResponseEntity.noContent().build();
    }
}
