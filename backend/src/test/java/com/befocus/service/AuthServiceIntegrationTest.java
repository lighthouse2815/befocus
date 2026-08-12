package com.befocus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.LoginRequest;
import com.befocus.dto.request.RegisterRequest;
import com.befocus.dto.response.AuthResponse;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.exception.ErrorCode;
import com.befocus.repository.RefreshTokenRepository;
import com.befocus.repository.UserRepository;
import com.befocus.security.JwtService;
import com.befocus.util.TokenUtil;

@SpringBootTest
@Transactional
class AuthServiceIntegrationTest {
    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private RefreshTokenRepository refreshTokenRepository;

    @Test
    void registerHashesThePasswordAndLoginIssuesAValidUserScopedSession() {
        AuthResponse registered = authService.register(new RegisterRequest(
                "  Minh An  ", "  AUTH.FLOW@Example.COM ", "StrongPass123"));
        User stored = userRepository.findByEmailIgnoreCase("auth.flow@example.com").orElseThrow();

        assertThat(stored.getName()).isEqualTo("Minh An");
        assertThat(stored.getPasswordHash()).isNotEqualTo("StrongPass123");
        assertThat(passwordEncoder.matches("StrongPass123", stored.getPasswordHash())).isTrue();
        assertThat(jwtService.parseUserId(registered.accessToken())).isEqualTo(stored.getId());

        AuthResponse loggedIn = authService.login(new LoginRequest("AUTH.FLOW@example.com", "StrongPass123"));
        assertThat(loggedIn.user().id()).isEqualTo(stored.getId());
        assertThat(loggedIn.refreshToken()).isNotEqualTo(registered.refreshToken());
        assertThatThrownBy(() -> authService.login(new LoginRequest("auth.flow@example.com", "wrong-password")))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }

    @Test
    void refreshRotatesTokensAndLogoutRevokesTheLatestToken() {
        AuthResponse registered = authService.register(new RegisterRequest(
                "Refresh User", "auth-refresh@example.com", "StrongPass123"));

        AuthResponse rotated = authService.refresh(registered.refreshToken());
        assertThat(rotated.refreshToken()).isNotEqualTo(registered.refreshToken());
        assertThatThrownBy(() -> authService.refresh(registered.refreshToken()))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED));

        authService.logout(rotated.refreshToken());
        assertThatThrownBy(() -> authService.refresh(rotated.refreshToken()))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }

    @Test
    void rejectsExpiredRefreshTokens() {
        AuthResponse registered = authService.register(new RegisterRequest(
                "Expired Refresh", "auth-expired-refresh@example.com", "StrongPass123"));
        var stored = refreshTokenRepository.findByTokenHash(TokenUtil.sha256(registered.refreshToken())).orElseThrow();
        stored.setExpiresAt(Instant.EPOCH);
        refreshTokenRepository.saveAndFlush(stored);

        assertThatThrownBy(() -> authService.refresh(registered.refreshToken()))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }
}
