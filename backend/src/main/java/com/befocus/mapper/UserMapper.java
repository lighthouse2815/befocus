package com.befocus.mapper;

import org.springframework.stereotype.Component;

import com.befocus.dto.response.UserResponse;
import com.befocus.entity.User;

@Component
public class UserMapper {
    public UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getTimezone());
    }
}
