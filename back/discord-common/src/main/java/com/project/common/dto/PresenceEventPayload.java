package com.project.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresenceEventPayload {
    private String eventType; // USER_ONLINE, USER_OFFLINE, VOICE_JOINED, VOICE_LEFT
    private String username;
    private Long voiceChannelId; // فقط وقتی وارد کانال صوتی شد پر می‌شود
}