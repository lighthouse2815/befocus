package com.befocus.dto.request;

public record NotificationPreferenceRequest(boolean enabled, boolean browserEnabled, boolean inAppEnabled) {
}
