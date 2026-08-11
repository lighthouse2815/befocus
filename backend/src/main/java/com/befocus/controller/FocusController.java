package com.befocus.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.befocus.dto.request.FocusInterruptionRequest;
import com.befocus.dto.request.FocusStartRequest;
import com.befocus.dto.response.FocusInterruptionResponse;
import com.befocus.dto.response.FocusSessionResponse;
import com.befocus.security.CurrentUser;
import com.befocus.service.FocusService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/v1/focus-sessions")
@Validated
public class FocusController {
    private final FocusService focusService;
    private final CurrentUser currentUser;

    public FocusController(FocusService focusService, CurrentUser currentUser) {
        this.focusService = focusService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<FocusSessionResponse> recent(
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit) {
        return focusService.recent(currentUser.id(), limit);
    }

    @GetMapping("/active")
    public ResponseEntity<FocusSessionResponse> active() {
        FocusSessionResponse active = focusService.active(currentUser.id());
        return active == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(active);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FocusSessionResponse start(@Valid @RequestBody FocusStartRequest request) {
        return focusService.start(currentUser.id(), request);
    }

    @PostMapping("/{sessionId}/pause")
    public FocusSessionResponse pause(@PathVariable UUID sessionId) {
        return focusService.pause(currentUser.id(), sessionId);
    }

    @PostMapping("/{sessionId}/resume")
    public FocusSessionResponse resume(@PathVariable UUID sessionId) {
        return focusService.resume(currentUser.id(), sessionId);
    }

    @PostMapping("/{sessionId}/complete")
    public FocusSessionResponse complete(@PathVariable UUID sessionId) {
        return focusService.complete(currentUser.id(), sessionId);
    }

    @PostMapping("/{sessionId}/cancel")
    public FocusSessionResponse cancel(@PathVariable UUID sessionId) {
        return focusService.cancel(currentUser.id(), sessionId);
    }

    @PostMapping("/{sessionId}/interruptions")
    @ResponseStatus(HttpStatus.CREATED)
    public FocusInterruptionResponse addInterruption(
            @PathVariable UUID sessionId,
            @Valid @RequestBody FocusInterruptionRequest request) {
        return focusService.addInterruption(currentUser.id(), sessionId, request);
    }
}
