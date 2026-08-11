package com.befocus.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record FocusStartRequest(
        @NotNull @Min(1) @Max(240) Integer plannedDurationMinutes,
        UUID projectId,
        UUID taskId,
        UUID habitId) {
}
