package com.befocus.dto.request;

import com.befocus.entity.InterruptionKind;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FocusInterruptionRequest(
        @NotNull InterruptionKind kind,
        @Size(max = 500) String note) {
}
