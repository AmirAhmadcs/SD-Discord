package com.project.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceSignalingPayload {
    private String type; // OFFER, ANSWER, ICE_CANDIDATE
    private String fromUser;
    private String toUser;
    private Long channelId; // کانالی که تماس در آن انجام می‌شود
    private String sdp; // برای OFFER و ANSWER
    private String candidate; // برای ICE_CANDIDATE
}