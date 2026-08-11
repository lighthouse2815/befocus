package com.befocus.dto.response;

import java.time.Instant;
import java.util.UUID;

import com.befocus.entity.InterruptionKind;

public record FocusInterruptionResponse(
        UUID id,
        InterruptionKind kind,
        String note,
        Instant occurredAt) {
}
