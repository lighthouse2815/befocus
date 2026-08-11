package com.befocus.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ActivityItem(UUID id, String type, String title, String description, Instant timestamp) {
}
