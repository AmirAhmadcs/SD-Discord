package com.project.websocket.controller;

import com.project.common.dto.LiveMessagePayload;
import com.project.common.dto.NotificationPayload;
import com.project.websocket.feign.ChatClient;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatClient chatClient;

    @MessageMapping("/chat/channel/{channelId}")
    public void handleChatMessage(
        @DestinationVariable Long channelId,
        @Payload LiveMessagePayload payload,
        Principal principal) {

        payload.setSenderUsername(principal.getName());
        payload.setChannelId(channelId);

        // ۱. ذخیره در دیتابیس از طریق ماژول chat
        LiveMessagePayload savedPayload = chatClient.saveAndSyncMessage(payload);

        // ۲. پخش عمومی پیام در کانال
        messagingTemplate.convertAndSend("/topic/channel/" + channelId, savedPayload);

        // ۳. ارسال نوتیفیکیشن به کاربر مقصد (فقط در چت‌های خصوصی DM)
        if (payload.getTargetUsername() != null) {
            NotificationPayload notif = NotificationPayload.builder()
                .type("NEW_MESSAGE")
                .senderUsername(principal.getName())
                .targetChannelId(channelId)
                .snippet(payload.getContent() != null && payload.getContent().length() > 30 ?
                    payload.getContent().substring(0, 30) + "..." : payload.getContent())
                .build();

            // ارسال به صف شخصی کاربر مقصد
            messagingTemplate.convertAndSendToUser(
                payload.getTargetUsername(),
                "/queue/notifications",
                notif
            );
        }
    }

    // فرانت این را صدا می‌زند وقتی کاربر وارد یک چت می‌شود (تیک خوانده شده)
    @MessageMapping("/chat/read/{channelId}")
    public void handleReadReceipt(
        @DestinationVariable Long channelId,
        Principal principal) {

        var readEvent = java.util.Map.of(
            "channelId", channelId,
            "readBy", principal.getName()
        );

        // پخش کردن به همه افراد داخل آن کانال
        messagingTemplate.convertAndSend("/topic/channel/" + channelId + "/read", readEvent);
    }
}