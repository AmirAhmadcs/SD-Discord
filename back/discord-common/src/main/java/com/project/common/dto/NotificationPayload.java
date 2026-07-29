package com.project.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPayload {
    private String type; // مثلا: "NEW_MESSAGE" یا "ADDED_TO_SERVER"
    private String senderUsername;
    private Long targetChannelId;
    private String snippet; // چند کلمه اول پیام
    private String chatName; // اسم سرور یا کانال
}