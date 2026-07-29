package com.project.websocket.listener;

import com.project.common.dto.PresenceEventPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PresenceEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageConverter jsonMessageConverter; // ✅ اضافه شد

    // ✅ تغییر در این انوتیشن: میگوییم اگر صف نبود خودش رو بسازه
    @RabbitListener(queuesToDeclare = @org.springframework.amqp.rabbit.annotation.Queue(
        value = "presence.queue",
        durable = "false",
        autoDelete = "false"))
    public void handlePresenceEvent(String payloadJson) { // ✅ دریافت به صورت استرینگ برای جلوگیری از ارور پارس
        try {
            PresenceEventPayload event = (PresenceEventPayload) jsonMessageConverter.fromMessage(
                org.springframework.amqp.core.MessageBuilder.withBody(payloadJson.getBytes()).build());

            messagingTemplate.convertAndSend("/topic/presence/global", event);

            if (event.getVoiceChannelId() != null) {
                messagingTemplate.convertAndSend("/topic/voice/" + event.getVoiceChannelId(), event);
            }
        } catch (Exception e) {
            log.error("Error processing presence event", e);
        }
    }
}