package com.befocus.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.befocus.dto.request.SettingsRequest;
import com.befocus.dto.response.SettingsResponse;
import com.befocus.security.CurrentUser;
import com.befocus.service.SettingsService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController {
    private final SettingsService settingsService;
    private final CurrentUser currentUser;

    public SettingsController(SettingsService settingsService, CurrentUser currentUser) {
        this.settingsService = settingsService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @Operation(summary = "Get personal settings")
    public SettingsResponse get() { return settingsService.get(currentUser.id()); }

    @PutMapping
    @Operation(summary = "Update personal settings")
    public SettingsResponse update(@Valid @RequestBody SettingsRequest request) { return settingsService.update(currentUser.id(), request); }
}
