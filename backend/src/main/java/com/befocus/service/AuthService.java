package com.befocus.service;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.LoginRequest;
import com.befocus.dto.request.RegisterRequest;
import com.befocus.dto.response.AuthResponse;
import com.befocus.entity.NotificationPreference;
import com.befocus.entity.RefreshToken;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.mapper.UserMapper;
import com.befocus.repository.NotificationPreferenceRepository;
import com.befocus.repository.RefreshTokenRepository;
import com.befocus.repository.UserRepository;
import com.befocus.security.JwtService;
import com.befocus.util.TokenUtil;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final Clock clock;
    private final long refreshTtlSeconds;

    public AuthService(UserRepository userRepository, NotificationPreferenceRepository preferenceRepository,
            RefreshTokenRepository refreshTokenRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
            UserMapper userMapper, Clock clock,
            @Value("${app.jwt.refresh-ttl-seconds:1209600}") long refreshTtlSeconds) {
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.clock = clock;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists.");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user = userRepository.save(user);

        NotificationPreference preference = new NotificationPreference();
        preference.setUser(user);
        preferenceRepository.save(preference);

        return issueTokens(user, UUID.randomUUID());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> ApiException.unauthorized("Email or password is incorrect."));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Email or password is incorrect.");
        }
        return issueTokens(user, UUID.randomUUID());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse refresh(String rawToken) {
        Instant now = clock.instant();
        RefreshToken current = refreshTokenRepository.findByTokenHash(TokenUtil.sha256(rawToken))
                .orElseThrow(() -> ApiException.unauthorized("Refresh token is invalid."));
        if (!current.isActive(now)) {
            if (current.getRevokedAt() != null && current.getReplacedByHash() != null) {
                refreshTokenRepository.revokeFamily(current.getFamilyId());
            }
            throw ApiException.unauthorized("Refresh token is invalid or expired.");
        }

        String nextRaw = TokenUtil.randomToken();
        current.setRevokedAt(now);
        current.setReplacedByHash(TokenUtil.sha256(nextRaw));
        refreshTokenRepository.save(current);

        RefreshToken next = new RefreshToken();
        next.setUser(current.getUser());
        next.setFamilyId(current.getFamilyId());
        next.setTokenHash(TokenUtil.sha256(nextRaw));
        next.setExpiresAt(now.plusSeconds(refreshTtlSeconds));
        refreshTokenRepository.save(next);

        return new AuthResponse(userMapper.toResponse(current.getUser()),
                jwtService.createAccessToken(current.getUser().getId(), current.getUser().getEmail()), nextRaw);
    }

    @Transactional
    public void logout(String rawToken) {
        refreshTokenRepository.findByTokenHash(TokenUtil.sha256(rawToken)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(clock.instant());
                refreshTokenRepository.save(token);
            }
        });
    }

    private AuthResponse issueTokens(User user, UUID familyId) {
        String rawRefreshToken = TokenUtil.randomToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setFamilyId(familyId);
        refreshToken.setTokenHash(TokenUtil.sha256(rawRefreshToken));
        refreshToken.setExpiresAt(clock.instant().plusSeconds(refreshTtlSeconds));
        refreshTokenRepository.save(refreshToken);
        return new AuthResponse(userMapper.toResponse(user), jwtService.createAccessToken(user.getId(), user.getEmail()),
                rawRefreshToken);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
