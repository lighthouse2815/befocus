package com.befocus.dto.request;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TaskRequest(
        @NotNull UUID projectId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 1000) String description,
        LocalDate dueDate) {
}
