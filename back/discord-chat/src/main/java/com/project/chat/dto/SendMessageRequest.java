package com.project.chat.dto;

import lombok.Data;

@Data
public class SendMessageRequest {

    private String content;
    private Long channelId;
    private String attachmentFileName;

    private Long topicId;
}