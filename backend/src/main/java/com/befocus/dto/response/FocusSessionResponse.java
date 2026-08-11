package com.befocus.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.befocus.entity.FocusStatus;

public record FocusSessionResponse(
        UUID id,
        FocusStatus status,
        int plannedDurationMinutes,
        Integer actualDurationMinutes,
        Instant startedAt,
        Instant expectedEndAt,
        Instant pausedAt,
        long totalPausedSeconds,
        Instant completedAt,
        Instant cancelledAt,
        UUID projectId,
        String projectName,
        UUID taskId,
        String taskTitle,
        UUID habitId,
        String habitName,
        List<FocusInterruptionResponse> interruptions) {
}
