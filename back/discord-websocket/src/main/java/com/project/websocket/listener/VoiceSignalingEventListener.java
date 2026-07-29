package com.project.websocket.listener;

import com.project.common.dto.VoiceSignalingPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class VoiceSignalingEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageConverter jsonMessageConverter; // ✅ اضافه شد

    // ✅ تغییر در این انوتیشن
    @RabbitListener(queuesToDeclare = @org.springframework.amqp.rabbit.annotation.Queue(
        value = "voice.queue",
        durable = "false",
        autoDelete = "false"))
    public void handleVoiceSignal(String payloadJson) {
        try {
            VoiceSignalingPayload payload = (VoiceSignalingPayload) jsonMessageConverter.fromMessage(
                org.springframework.amqp.core.MessageBuilder.withBody(payloadJson.getBytes()).build());

            log.info("Routing voice signal from {} to {}", payload.getFromUser(), payload.getToUser());
            messagingTemplate.convertAndSendToUser(payload.getToUser(), "/queue/voice-signaling", payload);
        } catch (Exception e) {
            log.error("Error processing voice signal", e);
        }
    }
}