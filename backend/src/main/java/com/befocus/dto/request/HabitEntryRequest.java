package com.befocus.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record HabitEntryRequest(
        @NotNull @DecimalMin(value = "0.0") @DecimalMax(value = "1000000") BigDecimal value,
        @Size(max = 1000) String note) {
}
