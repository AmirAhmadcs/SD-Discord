package com.project.presence.service;

import com.project.common.dto.PresenceEventPayload;
import com.project.presence.config.RabbitConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private final StringRedisTemplate redisTemplate;
    private final RabbitTemplate rabbitTemplate;

    // ذخیره وضعیت آنلاین بودن (با زمان انقضای 60 ثانیه، اگر پینگ نگرفت آفلاین میشود)
    public void setUserOnline(String username) {
        redisTemplate.opsForValue().set("presence:user:" + username, "ONLINE", 60, TimeUnit.SECONDS);
        broadcastEvent(PresenceEventPayload.builder().eventType("USER_ONLINE").username(username).build());
    }

    // حذف از ردیس هنگام خروج
    public void setUserOffline(String username) {
        redisTemplate.delete("presence:user:" + username);
        broadcastEvent(PresenceEventPayload.builder().eventType("USER_OFFLINE").username(username).build());
    }

    // اضافه کردن به کانال صوتی
    public void joinVoiceChannel(String username, Long channelId) {
        redisTemplate.opsForSet().add("voice:channel:" + channelId, username);
        broadcastEvent(PresenceEventPayload.builder()
            .eventType("VOICE_JOINED")
            .username(username)
            .voiceChannelId(channelId)
            .build());
    }

    // خروج از کانال صوتی
    public void leaveVoiceChannel(String username, Long channelId) {
        redisTemplate.opsForSet().remove("voice:channel:" + channelId, username);
        broadcastEvent(PresenceEventPayload.builder()
            .eventType("VOICE_LEFT")
            .username(username)
            .voiceChannelId(channelId)
            .build());
    }

    // گرفتن لیست افراد آنلاین در یک کانال صوتی خاص
    public Set<String> getUsersInVoiceChannel(Long channelId) {
        return redisTemplate.opsForSet().members("voice:channel:" + channelId);
    }

    // ارسال رویداد به ربیت تا وب‌سوکت آن را پخش کند
    private void broadcastEvent(PresenceEventPayload event) {
        rabbitTemplate.convertAndSend(RabbitConfig.PRESENCE_EXCHANGE, RabbitConfig.PRESENCE_ROUTING_KEY, event);
    }
}