package com.befocus.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record HabitEntryResponse(UUID id, LocalDate date, BigDecimal value, String note, boolean completed) {
}
