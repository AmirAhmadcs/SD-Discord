package com.project.auth.service;

import com.project.auth.entity.UserProfile;
import com.project.auth.feign.MediaClient;
import com.project.auth.repository.UserProfileRepository;
import com.project.common.dto.LoginRequest;
import com.project.common.dto.LoginResponse;
import com.project.common.dto.LogoutRequest;
import com.project.common.dto.UserDto;
import com.project.common.dto.UserProfileUpdateEvent;
import com.project.common.dto.UserProfileUpdateRequest;
import com.project.common.dto.UserRegistrationRequest;
import jakarta.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final Keycloak keycloak;
    private final UserProfileRepository userProfileRepository;
    private final MediaClient mediaClient;
    private final RestTemplate restTemplate = new RestTemplate();
    private final RabbitTemplate rabbitTemplate;

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.target-realm}")
    private String targetRealm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;


    @Transactional
    public void registerUser(UserRegistrationRequest request) {

        // --- Layer 2: Backend Guard (Check Local DB first) ---
        if (userProfileRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed: Username '{}' already exists", request.getUsername());
            throw new IllegalArgumentException("Username is already taken");
        }

        if (userProfileRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed: Email '{}' already exists", request.getEmail());
            throw new IllegalArgumentException("Email is already registered");
        }

        // --- Keycloak Registration ---
        UserRepresentation user = new UserRepresentation();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEnabled(true);

        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(request.getPassword());
        credential.setTemporary(false);
        user.setCredentials(Collections.singletonList(credential));

        Response response = keycloak.realm(targetRealm).users().create(user);

        if (response.getStatus() == 201) {
            log.info("User {} successfully created in Keycloak.", request.getUsername());

            UserProfile profile = UserProfile.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .allowGroupAdditions(true)
                .build();

            userProfileRepository.save(profile);
            log.info("User profile for {} saved in local database.", request.getUsername());

        } else {
            log.error("Failed to create user in Keycloak. Status: {}", response.getStatus());
            throw new RuntimeException("Failed to register user in Identity Provider.");
        }
    }

    public UserProfile getProfile(String username) {
        return userProfileRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User profile not found in local database"));
    }

    @Transactional
    public UserProfile updateProfile(String username, UserProfileUpdateRequest request) {
        UserProfile profile = getProfile(username);

        if (request.getFirstName() != null) profile.setFirstName(request.getFirstName());
        if (request.getLastName() != null) profile.setLastName(request.getLastName());
        if (request.getBio() != null) profile.setBio(request.getBio());

        // ⬇️ مدیریت هوشمند لیست عکس‌ها ⬇️
        if (request.getAvatarUrls() != null) {
            List<String> oldUrls = new ArrayList<>(profile.getAvatarUrls());
            profile.setAvatarUrls(request.getAvatarUrls());

            // پاک کردن عکس‌هایی که تو لیست جدید نیستن از روی سرور MinIO
            for (String oldUrl : oldUrls) {
                if (!request.getAvatarUrls().contains(oldUrl)) {
                    try {
                        mediaClient.deleteFile(oldUrl);
                    } catch (Exception e) {
                        System.err.println("Failed to delete old avatar: " + e.getMessage());
                    }
                }
            }
        }

        UserProfile savedProfile = userProfileRepository.save(profile);

        // ⬇️ ارسال رویداد برای وب‌سوکت (همون کد قبلی، فقط فیلد عوض شده) ⬇️
        UserProfileUpdateEvent event = UserProfileUpdateEvent.builder()
            .username(savedProfile.getUsername())
            .firstName(savedProfile.getFirstName())
            .lastName(savedProfile.getLastName())
            .avatarUrls(savedProfile.getAvatarUrls())
            .bio(savedProfile.getBio())
            .build();

        rabbitTemplate.convertAndSend("profile.exchange", "profile.updated", event);

        return savedProfile;
    }

    public UserDto getUserByUsername(String username) {
        UserProfile profile = userProfileRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User profile not found for: " + username));

        UserDto userDto = new UserDto();
        userDto.setUsername(profile.getUsername());
        userDto.setFirstName(profile.getFirstName());
        userDto.setLastName(profile.getLastName());
        userDto.setBio(profile.getBio());
        userDto.setAvatarUrls(profile.getAvatarUrls());

        return userDto;
    }

    @Transactional
    public void addProfilePicture(String username, String newAvatarUrl) {
        UserProfile user = userProfileRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found!"));

        // اضافه کردن عکس جدید به لیست (بدون پاک کردن قبلی‌ها)
        user.getAvatarUrls().add(newAvatarUrl);
        userProfileRepository.save(user);
    }

    public LoginResponse login(LoginRequest request) {
        log.info("Attempting to login user: {}", request.getUsername());

        String tokenUrl = serverUrl + "/realms/" + targetRealm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("username", request.getUsername());
        body.add("password", request.getPassword());

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

        try {
            // استفاده از خود DTO خود کی‌کلاک برای دریافت کامل پاسخ
            ResponseEntity<AccessTokenResponse> response = restTemplate.postForEntity(
                tokenUrl, entity, AccessTokenResponse.class);

            AccessTokenResponse tokenData = response.getBody();

            log.info("User {} logged in successfully.", request.getUsername());

            return LoginResponse.builder()
                .accessToken(tokenData.getToken())
                .refreshToken(tokenData.getRefreshToken())
                .expiresIn(tokenData.getExpiresIn())
                .build();

        } catch (Exception e) {
            log.error("Login failed for user {}: {}", request.getUsername(), e.getMessage());
            throw new RuntimeException("Invalid username or password");
        }
    }

    public void logout(LogoutRequest request) {
        log.info("Attempting to logout user by revoking refresh token.");

        String logoutUrl = serverUrl + "/realms/" + targetRealm + "/protocol/openid-connect/logout";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("refresh_token", request.getRefreshToken());

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(logoutUrl, entity, Void.class);
            log.info("User logged out successfully. Refresh token revoked.");
        } catch (Exception e) {
            log.error("Logout failed: {}", e.getMessage());
            throw new RuntimeException("Failed to logout. Invalid or expired refresh token.");
        }
    }

    public LoginResponse refreshToken(String refreshToken) {
        log.info("Attempting to refresh token.");

        String tokenUrl = serverUrl + "/realms/" + targetRealm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();

        // ⬇️ تنها تفاوت با متد لاگین در این دو خط است ⬇️
        body.add("grant_type", "refresh_token");
        body.add("refresh_token", refreshToken);

        // ⬇️ بقیه پارامترها دقیقاً مانند لاگین است ⬇️
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

        try {
            // استفاده از همان ساختار تمیز کی‌کلاک
            ResponseEntity<AccessTokenResponse> response = restTemplate.postForEntity(
                tokenUrl, entity, AccessTokenResponse.class);

            AccessTokenResponse tokenData = response.getBody();

            log.info("Token refreshed successfully.");

            // کی‌کلاک به صورت خودکار در زمان رفرش، یک Refresh Token جدید هم میده (برای امنیت بیشتر)
            return LoginResponse.builder()
                .accessToken(tokenData.getToken())
                .refreshToken(tokenData.getRefreshToken())
                .expiresIn(tokenData.getExpiresIn())
                .build();

        } catch (Exception e) {
            log.error("Token refresh failed: {}", e.getMessage());
            throw new RuntimeException("Invalid or expired refresh token");
        }
    }
}