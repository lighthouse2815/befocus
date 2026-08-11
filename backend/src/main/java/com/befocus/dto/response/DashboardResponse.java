package com.befocus.dto.response;

import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        LocalDate date,
        String greeting,
        HabitSummary habits,
        int focusMinutes,
        TaskSummary tasks,
        int currentStreak,
        List<WeeklyFocusPoint> weeklyFocus,
        List<ActivityItem> recentActivity,
        FocusSessionResponse activeSession) {
    public record HabitSummary(int completed, int total, int minutes) { }
    public record TaskSummary(long completed, long total) { }
    public record WeeklyFocusPoint(LocalDate date, int minutes) { }
}
