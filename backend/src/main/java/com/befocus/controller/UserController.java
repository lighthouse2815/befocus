package com.befocus.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.befocus.dto.request.UpdateProfileRequest;
import com.befocus.dto.response.UserResponse;
import com.befocus.security.CurrentUser;
import com.befocus.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserService userService;
    private final CurrentUser currentUser;

    public UserController(UserService userService, CurrentUser currentUser) {
        this.userService = userService;
        this.currentUser = currentUser;
    }

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated user")
    public UserResponse me() {
        return userService.get(currentUser.id());
    }

    @PutMapping("/me")
    @Operation(summary = "Update the authenticated user's profile")
    public UserResponse update(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.update(currentUser.id(), request);
    }
}
