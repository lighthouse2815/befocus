package com.befocus.service;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.dto.request.UpdateProfileRequest;
import com.befocus.dto.response.UserResponse;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.mapper.UserMapper;
import com.befocus.repository.UserRepository;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserService(UserRepository userRepository, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    @Transactional(readOnly = true)
    public UserResponse get(UUID userId) {
        return userMapper.toResponse(requireUser(userId));
    }

    @Transactional
    public UserResponse update(UUID userId, UpdateProfileRequest request) {
        try {
            ZoneId.of(request.timezone());
        } catch (DateTimeException ex) {
            throw ApiException.validation("Múi giờ không hợp lệ.", Map.of("timezone", "Hãy dùng một múi giờ IANA hợp lệ."));
        }
        User user = requireUser(userId);
        user.setName(request.name().trim());
        user.setTimezone(request.timezone());
        return userMapper.toResponse(userRepository.save(user));
    }

    public User requireUser(UUID userId) {
        return userRepository.findById(userId).orElseThrow(() -> ApiException.unauthorized("Tài khoản người dùng không còn tồn tại."));
    }
}
