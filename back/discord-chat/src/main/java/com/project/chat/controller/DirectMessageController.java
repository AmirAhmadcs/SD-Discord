package com.project.chat.controller;

import com.project.chat.dto.CreateDirectMessageRequest;
import com.project.chat.entity.Channel;
import com.project.chat.service.DirectMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dm")
@RequiredArgsConstructor
public class DirectMessageController {

    private final DirectMessageService directMessageService;

    /**
     * شروع یا ادامه یک چت خصوصی فرانت این آیدی کانال رو می‌گیره و سابسکرایب میشه به وب‌سوکتش
     */
    @PostMapping("/start")
    public ResponseEntity<Channel> startDirectMessage(
        @Valid @RequestBody CreateDirectMessageRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");

        Channel dmChannel = directMessageService.getOrCreateDirectChannel(username, request);
        return ResponseEntity.status(HttpStatus.OK).body(dmChannel);
    }
}