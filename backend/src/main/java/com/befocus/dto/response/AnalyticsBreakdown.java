package com.befocus.dto.response;

public record AnalyticsBreakdown(String label, String name, String key, int minutes, double value, int count,
        double completionRate) {
}
