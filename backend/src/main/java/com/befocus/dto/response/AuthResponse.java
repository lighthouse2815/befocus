package com.befocus.dto.response;

public record AuthResponse(UserResponse user, String accessToken, String refreshToken) {
}
