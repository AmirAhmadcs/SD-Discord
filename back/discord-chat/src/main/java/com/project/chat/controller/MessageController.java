package com.project.chat.controller;

import com.project.chat.dto.EditMessageRequest;
import com.project.chat.dto.MessageSearchResponse;
import com.project.chat.dto.SendMessageRequest;
import com.project.chat.entity.Message;
import com.project.chat.service.MessageService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<Message> sendMessage(@RequestBody SendMessageRequest request,
        @AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(messageService.sendMessage(request, username));
    }

    // تغییر: username رو هم پاس دادم
    @GetMapping("/channel/{channelId}")
    public ResponseEntity<List<Message>> getMessages(
        @PathVariable Long channelId,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        return ResponseEntity.ok(messageService.getChannelMessages(channelId, username));
    }

    // تغییر: username رو هم پاس دادم
    @GetMapping("/channel/{channelId}/search")
    public ResponseEntity<MessageSearchResponse> searchMessages(
        @PathVariable Long channelId,
        @RequestParam String keyword,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") int limit,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        return ResponseEntity.ok(
            messageService.searchMessages(channelId, keyword, cursor, limit, username));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
        @PathVariable Long messageId,
        Principal principal) {

        messageService.deleteMessage(messageId, principal.getName());
        return ResponseEntity.ok().build();
    }

    /**
     * API ویرایش پیام
     */
    @PostMapping("/{messageId}")
    public ResponseEntity<Message> editMessage(
        @PathVariable Long messageId,
        @Valid @RequestBody EditMessageRequest request,
        Principal principal) {

        Message editedMessage = messageService.editMessage(messageId, request.getContent(),
            principal.getName());
        return ResponseEntity.ok(editedMessage);
    }

    /**
     * API ویرایش پیام
     */
    @PutMapping("/{messageId}")
    public ResponseEntity<Message> editMessage(
        @PathVariable Long messageId,
        @Valid @RequestBody EditMessageRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        Message editedMessage = messageService.editMessage(messageId, request.getContent(), username);
        return ResponseEntity.ok(editedMessage);
    }
}