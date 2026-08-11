package com.befocus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.BeFocusApplication;
import com.befocus.dto.request.NotificationPreferenceRequest;
import com.befocus.dto.request.SettingsRequest;
import com.befocus.dto.response.DashboardResponse;
import com.befocus.dto.response.FocusAnalyticsResponse;
import com.befocus.dto.response.SettingsResponse;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.exception.ErrorCode;
import com.befocus.repository.UserRepository;

@SpringBootTest(classes = { BeFocusApplication.class, AnalyticsSettingsServiceIntegrationTest.ClockConfiguration.class })
@Transactional
class AnalyticsSettingsServiceIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-08-12T02:00:00Z");

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private SettingsService settingsService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void analyticsReturnsEmptyRealStateWithoutInventedActivity() {
        User user = user("analytics-empty@example.com");
        DashboardResponse dashboard = analyticsService.dashboard(user.getId(), null);
        FocusAnalyticsResponse focus = analyticsService.focus(user.getId(), null, null);

        assertThat(dashboard.focusMinutes()).isZero();
        assertThat(dashboard.habits().total()).isZero();
        assertThat(dashboard.tasks().total()).isZero();
        assertThat(focus.totalMinutes()).isZero();
        assertThat(focus.completedSessions()).isZero();
        assertThat(focus.insights()).isNotEmpty();
    }

    @Test
    void settingsRoundTripAndValidateTimezone() {
        User user = user("settings-flow@example.com");
        SettingsResponse saved = settingsService.update(user.getId(), new SettingsRequest(
                50, 10, 20, 3, "UTC", true, true, false, "dark"));

        assertThat(saved.defaultFocusMinutes()).isEqualTo(50);
        assertThat(saved.timezone()).isEqualTo("UTC");
        assertThat(saved.notificationsEnabled()).isTrue();
        assertThat(saved.browserNotifications()).isTrue();
        assertThat(saved.inAppNotifications()).isFalse();
        assertThat(saved.theme()).isEqualTo("DARK");
        assertThat(settingsService.get(user.getId()).theme()).isEqualTo("DARK");

        settingsService.updateNotifications(user.getId(), new NotificationPreferenceRequest(false, false, true));
        assertThat(settingsService.notifications(user.getId()).inAppEnabled()).isTrue();
        assertThatThrownBy(() -> settingsService.update(user.getId(), new SettingsRequest(
                25, 5, 15, 4, "not-a-zone", false, false, true, "system")))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    private User user(String email) {
        User user = new User();
        user.setName("Test User");
        user.setEmail(email);
        user.setPasswordHash("not-used-in-service-tests");
        user.setTimezone("Asia/Ho_Chi_Minh");
        return userRepository.saveAndFlush(user);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ClockConfiguration {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }
}
