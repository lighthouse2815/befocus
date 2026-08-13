package com.befocus.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.befocus.dto.response.ErrorResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex) {
        HttpStatus status = switch (ex.getCode()) {
            case UNAUTHORIZED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
            case INVALID_STATE -> HttpStatus.UNPROCESSABLE_ENTITY;
            case VALIDATION_ERROR -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
        return ResponseEntity.status(status).body(error(status, ex.getCode().name(), ex.getMessage(), ex.getErrors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(error.getField(), localizedValidationMessage(error));
        }
        return ResponseEntity.badRequest().body(error(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR.name(),
                "Vui lòng kiểm tra các trường được đánh dấu.", fields));
    }

    @ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class })
    public ResponseEntity<ErrorResponse> handleMalformed(Exception ex) {
        return ResponseEntity.badRequest().body(error(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR.name(),
                "Định dạng yêu cầu không hợp lệ.", Map.of()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error(HttpStatus.CONFLICT, ErrorCode.CONFLICT.name(),
                "Dữ liệu yêu cầu xung đột với dữ liệu hiện có.", Map.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled request failure", ex);
        return ResponseEntity.internalServerError().body(error(HttpStatus.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_ERROR.name(), "Đã xảy ra lỗi. Vui lòng thử lại sau.", Map.of()));
    }

    private String localizedValidationMessage(FieldError error) {
        String defaultMessage = error.getDefaultMessage();
        if (defaultMessage != null && defaultMessage.codePoints().anyMatch(codePoint -> codePoint > 127)) {
            return defaultMessage;
        }
        return switch (error.getCode() == null ? "" : error.getCode()) {
            case "NotBlank" -> "Không được để trống.";
            case "NotNull" -> "Bắt buộc phải có.";
            case "Email" -> "Email không đúng định dạng.";
            case "Size" -> "Độ dài không hợp lệ.";
            case "Min", "Max", "DecimalMin", "DecimalMax" -> "Giá trị nằm ngoài phạm vi cho phép.";
            default -> defaultMessage == null ? "Dữ liệu không hợp lệ." : defaultMessage;
        };
    }

    private ErrorResponse error(HttpStatus status, String code, String message, Map<String, String> errors) {
        return new ErrorResponse(Instant.now(), status.value(), code, message, errors);
    }
}
