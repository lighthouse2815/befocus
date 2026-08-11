package com.befocus.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.befocus.dto.request.NotificationPreferenceRequest;
import com.befocus.dto.response.NotificationPreferenceResponse;
import com.befocus.security.CurrentUser;
import com.befocus.service.SettingsService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/notifications/preferences")
public class NotificationController {
    private final SettingsService settingsService;
    private final CurrentUser currentUser;

    public NotificationController(SettingsService settingsService, CurrentUser currentUser) {
        this.settingsService = settingsService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public NotificationPreferenceResponse get() { return settingsService.notifications(currentUser.id()); }

    @PutMapping
    public NotificationPreferenceResponse update(@Valid @RequestBody NotificationPreferenceRequest request) {
        return settingsService.updateNotifications(currentUser.id(), request);
    }
}
