package com.befocus.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.RegisterRequest;
import com.befocus.dto.response.AuthResponse;
import com.befocus.security.JwtService;
import com.befocus.service.AuthService;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FocusControllerSecurityIntegrationTest {
    private static final String TEST_JWT_SECRET = "test-secret-that-is-long-enough-for-hmac-sha-256-signatures";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthService authService;

    @Test
    void protectsEndpointsValidatesPayloadAndHidesOtherUsersSessions() throws Exception {
        AuthResponse owner = authService.register(new RegisterRequest(
                "Owner", "focus-controller-owner@example.com", "StrongPass123"));
        AuthResponse other = authService.register(new RegisterRequest(
                "Other", "focus-controller-other@example.com", "StrongPass123"));
        String payload = """
                {
                  "plannedDurationMinutes": 25,
                  "projectId": null,
                  "taskId": null,
                  "habitId": null
                }
                """;

        mockMvc.perform(post("/api/v1/focus-sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Bạn cần đăng nhập để tiếp tục."));

        String sessionId = mockMvc.perform(post("/api/v1/focus-sessions")
                        .header("Authorization", "Bearer " + owner.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("RUNNING"))
                .andReturn()
                .getResponse()
                .getContentAsString()
                .replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(post("/api/v1/focus-sessions/{id}/pause", sessionId)
                        .header("Authorization", "Bearer " + other.accessToken()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/v1/focus-sessions")
                        .header("Authorization", "Bearer " + other.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "plannedDurationMinutes": 0
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Vui lòng kiểm tra các trường được đánh dấu."))
                .andExpect(jsonPath("$.errors.plannedDurationMinutes").value("Giá trị nằm ngoài phạm vi cho phép."));
    }

    @Test
    void rejectsMalformedAndExpiredAccessTokens() throws Exception {
        AuthResponse owner = authService.register(new RegisterRequest(
                "Expired Owner", "focus-expired-token@example.com", "StrongPass123"));
        String payload = """
                {
                  "plannedDurationMinutes": 25
                }
                """;
        JwtService expiredJwtService = new JwtService(TEST_JWT_SECRET, 60,
                Clock.fixed(Instant.parse("2020-01-01T00:00:00Z"), ZoneOffset.UTC));
        String expiredToken = expiredJwtService.createAccessToken(owner.user().id(), owner.user().email());

        mockMvc.perform(post("/api/v1/focus-sessions")
                        .header("Authorization", "Bearer malformed-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(post("/api/v1/focus-sessions")
                        .header("Authorization", "Bearer " + expiredToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }
}
