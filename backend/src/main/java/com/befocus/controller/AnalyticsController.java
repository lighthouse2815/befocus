package com.befocus.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.befocus.dto.response.DashboardResponse;
import com.befocus.dto.response.FocusAnalyticsResponse;
import com.befocus.dto.response.HabitAnalyticsResponse;
import com.befocus.security.CurrentUser;
import com.befocus.service.AnalyticsService;

import io.swagger.v3.oas.annotations.Operation;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsService analyticsService;
    private final CurrentUser currentUser;

    public AnalyticsController(AnalyticsService analyticsService, CurrentUser currentUser) {
        this.analyticsService = analyticsService;
        this.currentUser = currentUser;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get the daily dashboard")
    public DashboardResponse dashboard(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return analyticsService.dashboard(currentUser.id(), date);
    }

    @GetMapping("/focus")
    @Operation(summary = "Get focus analytics")
    public FocusAnalyticsResponse focus(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analyticsService.focus(currentUser.id(), from, to);
    }

    @GetMapping("/habits")
    @Operation(summary = "Get habit analytics")
    public HabitAnalyticsResponse habits(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analyticsService.habits(currentUser.id(), from, to);
    }
}
