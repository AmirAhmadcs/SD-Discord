package com.project.chat.controller;

import com.project.chat.dto.EditMessageRequest;
import com.project.chat.dto.MessageSearchResponse;
import com.project.chat.dto.SendMessageRequest;
import com.project.chat.entity.Message;
import com.project.chat.service.MessageService;
import com.project.common.dto.LiveMessagePayload;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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

    public static final String EVENT_CREATE = "CREATE";
    public static final String EVENT_EDIT = "EDIT";
    public static final String EVENT_DELETE = "DELETE";

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    private void broadcast(Message message, String eventType) {
        LiveMessagePayload payload = new LiveMessagePayload();
        payload.setEventType(eventType);
        payload.setId(message.getId());
        payload.setChannelId(message.getChannel().getId());
        payload.setContent(message.getContent());
        payload.setSenderUsername(message.getSenderUsername());
        payload.setAttachmentFileName(message.getAttachmentFileName());
        payload.setCreatedAt(message.getCreatedAt());
        payload.setTopicId(message.getTopic() != null ? message.getTopic().getId() : null);
        payload.setIsEdited(message.getIsEdited());
        payload.setUpdatedAt(message.getUpdatedAt());

        try {
            messagingTemplate.convertAndSend("/topic/channel/" + payload.getChannelId(), payload);
        } catch (Exception e) {
            // A broker outage must not fail the message operation itself.
        }
    }

    @PostMapping
    public ResponseEntity<Message> sendMessage(@RequestBody SendMessageRequest request,
        @AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        Message savedMessage = messageService.sendMessage(request, username);
        broadcast(savedMessage, EVENT_CREATE);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedMessage);
    }

    @GetMapping("/channel/{channelId}")
    public ResponseEntity<List<Message>> getMessages(
        @PathVariable Long channelId,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        return ResponseEntity.ok(messageService.getChannelMessages(channelId, username));
    }

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
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        Message deleted = messageService.deleteMessage(messageId, username);
        broadcast(deleted, EVENT_DELETE);
        return ResponseEntity.ok().build();
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
        broadcast(editedMessage, EVENT_EDIT);
        return ResponseEntity.ok(editedMessage);
    }
}
