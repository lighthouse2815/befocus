package com.befocus.exception;

import java.util.Map;

import lombok.Getter;

@Getter
public class ApiException extends RuntimeException {
    private final ErrorCode code;
    private final Map<String, String> errors;

    private ApiException(ErrorCode code, String message, Map<String, String> errors) {
        super(message);
        this.code = code;
        this.errors = errors;
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(ErrorCode.UNAUTHORIZED, message, Map.of());
    }

    public static ApiException forbidden(String message) {
        return new ApiException(ErrorCode.FORBIDDEN, message, Map.of());
    }

    public static ApiException notFound(String message) {
        return new ApiException(ErrorCode.NOT_FOUND, message, Map.of());
    }

    public static ApiException conflict(String message) {
        return new ApiException(ErrorCode.CONFLICT, message, Map.of());
    }

    public static ApiException invalidState(String message) {
        return new ApiException(ErrorCode.INVALID_STATE, message, Map.of());
    }

    public static ApiException validation(String message, Map<String, String> errors) {
        return new ApiException(ErrorCode.VALIDATION_ERROR, message, errors == null ? Map.of() : errors);
    }
}
