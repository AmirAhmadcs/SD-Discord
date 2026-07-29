package com.project.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTopicRequest {

    @NotNull(message = "Channel ID is required")
    private Long channelId;

    @NotBlank(message = "Topic name cannot be blank")
    private String name;
}