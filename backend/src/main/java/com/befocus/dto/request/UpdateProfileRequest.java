package com.befocus.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 64) String timezone) {
}
