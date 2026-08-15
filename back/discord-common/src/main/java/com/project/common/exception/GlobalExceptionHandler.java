package com.project.common.exception;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private ResponseEntity<Map<String, Object>> errorResponse(HttpStatus status, String message,
        Map<String, String> errors) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("message", message);
        if (errors != null && !errors.isEmpty()) {
            body.put("errors", errors);
        }
        return ResponseEntity.status(status).body(body);
    }

    private Map<String, String> collectFieldErrors(List<FieldError> errors) {
        Map<String, String> result = new HashMap<>();
        for (FieldError error : errors) {
            result.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        return result;
    }

    /**
     * Handles validation errors (e.g., invalid email format or short passwords)
     * on @Valid @RequestBody arguments.
     * Returns 400 with field-name -> message details.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(
        MethodArgumentNotValidException ex) {
        return errorResponse(HttpStatus.BAD_REQUEST, "Validation failed",
            collectFieldErrors(ex.getBindingResult().getFieldErrors()));
    }

    /**
     * Handles binding errors for form/@ModelAttribute request objects.
     */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<Map<String, Object>> handleBindException(BindException ex) {
        return errorResponse(HttpStatus.BAD_REQUEST, "Validation failed",
            collectFieldErrors(ex.getBindingResult().getFieldErrors()));
    }

    /**
     * Handles constraint violations on @Validated method parameters and
     * path/query variables.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(
        ConstraintViolationException ex) {
        Map<String, String> errors = new HashMap<>();
        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
            errors.put(violation.getPropertyPath().toString(), violation.getMessage());
        }
        return errorResponse(HttpStatus.BAD_REQUEST, "Validation failed", errors);
    }

    /**
     * Handles method-level validation failures (Spring 6.1+) that surface as
     * HandlerMethodValidationException instead of MethodArgumentNotValidException.
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, Object>> handleHandlerMethodValidation(
        HandlerMethodValidationException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getAllValidationResults().forEach(result ->
            result.getResolvableErrors().forEach(error -> {
                String field = result.getMethodParameter().getParameterName();
                errors.putIfAbsent(field, error.getDefaultMessage());
            }));
        return errorResponse(HttpStatus.BAD_REQUEST, "Validation failed", errors);
    }

    /**
     * Handles data conflict errors (e.g., duplicate username or email).
     * Returns 409 Conflict.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(
        IllegalArgumentException ex) {
        log.warn("Data conflict: {}", ex.getMessage());
        return errorResponse(HttpStatus.CONFLICT, ex.getMessage(), null);
    }

    /**
     * Handles all unexpected system errors (e.g., database or Keycloak connection failures).
     * Prevents stack traces and internal details from being exposed to the client.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGlobalExceptions(Exception ex) {
        log.error("An unexpected error occurred: ", ex);
        return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR,
            "An internal server error occurred. Please try again later.", null);
    }
}
