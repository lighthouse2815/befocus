package com.befocus.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        String name,
        String description,
        String color,
        String icon,
        Instant archivedAt,
        boolean archived,
        int totalFocusMinutes,
        long completedTasks,
        long pendingTasks,
        List<TaskResponse> tasks,
        List<FocusSessionResponse> recentSessions,
        List<WeeklyActivityPoint> weeklyActivity) {
}
