package com.befocus.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.befocus.entity.TaskStatus;

public record TaskResponse(
        UUID id,
        UUID projectId,
        String projectName,
        String title,
        String description,
        LocalDate dueDate,
        TaskStatus status,
        boolean completed,
        Instant completedAt,
        int focusMinutes) {
}
