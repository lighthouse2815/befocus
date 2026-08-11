package com.befocus.dto.response;

import java.time.LocalDate;

public record WeeklyActivityPoint(LocalDate date, int minutes) {
}
