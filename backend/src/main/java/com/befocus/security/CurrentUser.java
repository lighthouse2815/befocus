package com.befocus.security;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.befocus.exception.ApiException;

@Component
public class CurrentUser {
    public UUID id() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID userId)) {
            throw ApiException.unauthorized("Bạn cần đăng nhập để tiếp tục.");
        }
        return userId;
    }
}
