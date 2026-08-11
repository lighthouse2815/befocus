package com.befocus.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.HabitRequest;
import com.befocus.dto.request.RegisterRequest;
import com.befocus.dto.response.AuthResponse;
import com.befocus.dto.response.HabitResponse;
import com.befocus.entity.HabitType;
import com.befocus.entity.ScheduleType;
import com.befocus.service.AuthService;
import com.befocus.service.HabitService;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class HabitControllerSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthService authService;

    @Autowired
    private HabitService habitService;

    @Test
    void requiresJwtAndDoesNotExposeAnotherUsersHabit() throws Exception {
        AuthResponse owner = authService.register(new RegisterRequest(
                "Owner", "controller-owner@example.com", "StrongPass123"));
        AuthResponse other = authService.register(new RegisterRequest(
                "Other", "controller-other@example.com", "StrongPass123"));
        HabitResponse habit = habitService.create(owner.user().id(), new HabitRequest(
                "Private habit", null, HabitType.BOOLEAN, BigDecimal.ONE, "lần",
                ScheduleType.DAILY, List.of(), null, null, null, null, "moss"));

        mockMvc.perform(get("/api/v1/habits/{id}", habit.id()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/v1/habits/{id}", habit.id())
                        .header("Authorization", "Bearer " + owner.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(habit.id().toString()))
                .andExpect(jsonPath("$.name").value("Private habit"));

        mockMvc.perform(get("/api/v1/habits/{id}", habit.id())
                        .header("Authorization", "Bearer " + other.accessToken()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void returnsStructuredFieldErrorsForInvalidHabitPayload() throws Exception {
        AuthResponse session = authService.register(new RegisterRequest(
                "Validator", "controller-validation@example.com", "StrongPass123"));

        mockMvc.perform(post("/api/v1/habits")
                        .header("Authorization", "Bearer " + session.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "",
                                  "type": "COUNT",
                                  "targetValue": 0,
                                  "scheduleType": "DAILY"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.targetValue").exists());
    }
}
