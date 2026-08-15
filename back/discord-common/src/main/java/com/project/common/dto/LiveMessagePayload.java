package com.project.common.dto;

import lombok.Data;

@Data
public class LiveMessagePayload {
    // "CREATE" | "EDIT" | "DELETE"
    private String eventType;
    private Long id;
    private String content;
    private String senderUsername;
    private Long createdAt;
    private Long updatedAt;
    private Boolean isEdited;
    private Long channelId;
    private Long topicId;
    private String attachmentFileName;

    // ✅ این فیلد را اضافه کن (فرانت هنگام ارسال پیام در DM، نام طرف مقابل را اینجا می‌گذارد)
    private String targetUsername;
}