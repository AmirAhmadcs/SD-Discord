package com.project.voice.controller;

import com.project.common.dto.VoiceSignalingPayload;
import com.project.voice.config.RabbitConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/voice")
@RequiredArgsConstructor
public class VoiceSignalingController {

    private final RabbitTemplate rabbitTemplate;

    // فرانت این را صدا میزند تا مثلاً OFFER خود را برای فرستنده بفرستد
    @PostMapping("/signal")
    public ResponseEntity<Void> sendSignal(@RequestBody VoiceSignalingPayload payload, @AuthenticationPrincipal Jwt jwt) {
        String sender = jwt.getClaimAsString("preferred_username");
        payload.setFromUser(sender); // جلوگیری از جعل هویت

        // فرستادن به ربیت تا وب‌سوکت آن را به کاربر مقصد برساند
        rabbitTemplate.convertAndSend(RabbitConfig.VOICE_EXCHANGE, RabbitConfig.VOICE_ROUTING_KEY, payload);

        return ResponseEntity.ok().build();
    }
}