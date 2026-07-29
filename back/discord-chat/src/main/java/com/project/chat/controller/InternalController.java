package com.project.chat.controller;

import com.project.chat.dto.SendMessageRequest;
import com.project.chat.entity.Message;
import com.project.chat.service.MessageService;
import com.project.common.dto.LiveMessagePayload;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController // ✅ حتما اضافه شود
@RequestMapping("/api/v1/messages") // ✅ حتما اضافه شود
@RequiredArgsConstructor // ✅ حتما اضافه شود
public class InternalController {

    private final MessageService messageService;

    @PostMapping("/ws-sync")
    public ResponseEntity<LiveMessagePayload> syncWebSocketMessage(
        @RequestBody LiveMessagePayload payload,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");

        SendMessageRequest request = new SendMessageRequest();
        request.setChannelId(payload.getChannelId());
        request.setContent(payload.getContent());
        request.setAttachmentFileName(payload.getAttachmentFileName());
        request.setTopicId(payload.getTopicId()); // ✅ پاس دادن تاپیک آیدی

        // ذخیره در دیتابیس
        Message savedMessage = messageService.sendMessage(request, username);

        // قرار دادن اطلاعات واقعی دیتابیس در پیلود
        payload.setId(savedMessage.getId());
        payload.setCreatedAt(savedMessage.getCreatedAt());

        return ResponseEntity.ok(payload);
    }
}