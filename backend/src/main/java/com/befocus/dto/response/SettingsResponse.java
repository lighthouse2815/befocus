package com.befocus.dto.response;

public record SettingsResponse(
        int defaultFocusMinutes,
        int defaultBreakMinutes,
        int longBreakMinutes,
        int sessionsBeforeLongBreak,
        String timezone,
        boolean notificationsEnabled,
        boolean browserNotifications,
        boolean inAppNotifications,
        String theme) {
}
