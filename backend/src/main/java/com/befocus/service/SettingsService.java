package com.befocus.service;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.NotificationPreferenceRequest;
import com.befocus.dto.request.SettingsRequest;
import com.befocus.dto.response.NotificationPreferenceResponse;
import com.befocus.dto.response.SettingsResponse;
import com.befocus.entity.NotificationPreference;
import com.befocus.entity.Theme;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.repository.NotificationPreferenceRepository;
import com.befocus.repository.UserRepository;

@Service
public class SettingsService {
    private final UserRepository userRepository;
    private final NotificationPreferenceRepository preferenceRepository;

    public SettingsService(UserRepository userRepository, NotificationPreferenceRepository preferenceRepository) {
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @Transactional(readOnly = true)
    public SettingsResponse get(UUID userId) {
        User user = user(userId);
        NotificationPreference preference = preferenceRepository.findByUserId(userId).orElse(null);
        return response(user, preference);
    }

    @Transactional
    public SettingsResponse update(UUID userId, SettingsRequest request) {
        User user = user(userId);
        try {
            ZoneId.of(request.timezone());
        } catch (DateTimeException ex) {
            throw ApiException.validation("Timezone is invalid.", java.util.Map.of("timezone", "Use a valid IANA timezone."));
        }
        Theme theme;
        try {
            theme = Theme.valueOf(request.theme().trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("Theme is invalid.", java.util.Map.of("theme", "Use light, dark, or system."));
        }
        user.setDefaultFocusMinutes(request.defaultFocusMinutes());
        user.setDefaultBreakMinutes(request.defaultBreakMinutes());
        user.setLongBreakMinutes(request.longBreakMinutes());
        user.setSessionsBeforeLongBreak(request.sessionsBeforeLongBreak());
        user.setTimezone(request.timezone().trim());
        user.setTheme(theme);
        userRepository.save(user);
        NotificationPreference preference = preference(userId, user);
        preference.setEnabled(request.notificationsEnabled());
        preference.setBrowserEnabled(request.browserNotifications());
        preference.setInAppEnabled(request.inAppNotifications());
        preferenceRepository.save(preference);
        return response(user, preference);
    }

    @Transactional(readOnly = true)
    public NotificationPreferenceResponse notifications(UUID userId) {
        return notificationResponse(preferenceRepository.findByUserId(userId).orElse(null));
    }

    @Transactional
    public NotificationPreferenceResponse updateNotifications(UUID userId, NotificationPreferenceRequest request) {
        User user = user(userId);
        NotificationPreference preference = preference(userId, user);
        preference.setEnabled(request.enabled());
        preference.setBrowserEnabled(request.browserEnabled());
        preference.setInAppEnabled(request.inAppEnabled());
        return notificationResponse(preferenceRepository.save(preference));
    }

    private NotificationPreference preference(UUID userId, User user) {
        return preferenceRepository.findByUserId(userId).orElseGet(() -> {
            NotificationPreference created = new NotificationPreference();
            created.setUser(user);
            created.setInAppEnabled(true);
            return created;
        });
    }

    private SettingsResponse response(User user, NotificationPreference preference) {
        return new SettingsResponse(user.getDefaultFocusMinutes(), user.getDefaultBreakMinutes(), user.getLongBreakMinutes(),
                user.getSessionsBeforeLongBreak(), user.getTimezone(), preference != null && preference.isEnabled(),
                preference != null && preference.isBrowserEnabled(), preference == null || preference.isInAppEnabled(),
                user.getTheme().name());
    }

    private NotificationPreferenceResponse notificationResponse(NotificationPreference preference) {
        return new NotificationPreferenceResponse(preference != null && preference.isEnabled(),
                preference != null && preference.isBrowserEnabled(), preference == null || preference.isInAppEnabled());
    }

    private User user(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.unauthorized("User account no longer exists."));
    }
}
