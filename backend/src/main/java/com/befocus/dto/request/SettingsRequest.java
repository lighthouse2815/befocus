package com.befocus.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SettingsRequest(
        @Min(1) @Max(240) int defaultFocusMinutes,
        @Min(1) @Max(120) int defaultBreakMinutes,
        @Min(1) @Max(120) int longBreakMinutes,
        @Min(1) @Max(12) int sessionsBeforeLongBreak,
        @NotBlank @Size(max = 64) String timezone,
        boolean notificationsEnabled,
        boolean browserNotifications,
        boolean inAppNotifications,
        @NotBlank @Size(max = 16) String theme) {
}
