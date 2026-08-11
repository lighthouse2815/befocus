package com.befocus.dto.response;

import java.util.List;

public record FocusAnalyticsResponse(
        int totalMinutes,
        int averageSessionMinutes,
        int completedSessions,
        double completionRate,
        List<AnalyticsBreakdown> byProject,
        List<AnalyticsBreakdown> byTask,
        List<AnalyticsBreakdown> byHabit,
        List<AnalyticsBreakdown> byWeekday,
        List<AnalyticsBreakdown> byHour,
        int interruptions,
        List<String> insights) {
}
