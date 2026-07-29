package com.project.auth.controller;

import com.project.auth.entity.UserProfile;
import com.project.auth.service.UserService;
import com.project.common.dto.LoginRequest;
import com.project.common.dto.LoginResponse;
import com.project.common.dto.LogoutRequest;
import com.project.common.dto.RefreshTokenRequest;
import com.project.common.dto.UserDto;
import com.project.common.dto.UserProfileUpdateRequest;
import com.project.common.dto.UserRegistrationRequest;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<String> registerUser(
        @Valid @RequestBody UserRegistrationRequest request) {
        log.info("Request received to register new user: {}", request.getUsername());

        try {
            userService.registerUser(request);

            return ResponseEntity.status(HttpStatus.CREATED)
                .body("User registered successfully");
        } catch (Exception e) {
            log.error("Failed to register user: {}", request.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Registration failed: " + e.getMessage());
        }
    }

    /**
     * API دریافت پروفایل من فقط کاربری که توکن معتبر داره می‌تونه این رو صدا بزنه
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfile> getMyProfile(@AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        log.info("Fetching profile for user: {}", username);

        UserProfile profile = userService.getProfile(username);
        return ResponseEntity.ok(profile);
    }

    /**
     * API ویرایش پروفایل من
     */
    @PutMapping("/me")
    public ResponseEntity<UserProfile> updateMyProfile(
        @AuthenticationPrincipal Jwt jwt,
        @RequestBody UserProfileUpdateRequest request) {

        String username = jwt.getClaimAsString("preferred_username");
        log.info("Updating profile for user: {}", username);

        UserProfile updatedProfile = userService.updateProfile(username, request);
        return ResponseEntity.ok(updatedProfile);
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserDto> getUserProfileByUsername(@PathVariable String username) {
        UserDto userDto = userService.getUserByUsername(username); // یا userProfileService
        return ResponseEntity.ok(userDto);
    }

    @PutMapping("/avatar")
    public ResponseEntity<Void> updateAvatar(
        @RequestParam String newAvatarUrl,
        Principal principal) {

        userService.addProfilePicture(principal.getName(), newAvatarUrl);
        return ResponseEntity.ok().build();
    }

    /**
     * API لاگین کاربر - فرانت نیازی نیست با کی‌کلاک درگیر بشه
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login request received for user: {}", request.getUsername());

        try {
            LoginResponse response = userService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.warn("Authentication failed: {}", e.getMessage());
            // بهترین پرکتیس برای لاگین ناموفق، کد 401 Unauthorized هست
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * API خروج کاربر - باطلال کردن توکن در سرور کی‌کلاک
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        log.info("Logout request received.");

        try {
            userService.logout(request);
            // کد 204 یعنی عملیات موفق بود و هیچ بدنه‌ای برنمی‌گردونه
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.warn("Logout failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * API رفرش توکن - فرانت نیازی نیست با کی‌کلاک درگیر بشه
     */
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        log.info("Refresh token request received.");

        try {
            LoginResponse response = userService.refreshToken(request.getRefreshToken());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.warn("Token refresh failed: {}", e.getMessage());
            // اگر توکن رفرش هم منقضی شده باشه، فرانت باید کاربر رو بفرسته صفحه لاگین
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }
}