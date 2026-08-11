package com.befocus.dto.response;

import java.util.List;

public record HabitAnalyticsResponse(
        double completionRate,
        int currentStreak,
        int longestStreak,
        double consistency,
        List<DailyProgressPoint> dailyProgress,
        List<WeeklyProgressPoint> weeklyProgress,
        List<HeatmapCell> heatmap,
        List<HabitBreakdown> habits) {
    public record DailyProgressPoint(String date, int completed, int total, double rate) { }
    public record WeeklyProgressPoint(String week, int completed, int total, double rate) { }
    public record HeatmapCell(String date, double value, double target, boolean completed) { }
    public record HabitBreakdown(String id, String name, double completionRate, int currentStreak, int longestStreak) { }
}
