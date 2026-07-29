package com.project.chat.dto;

import com.project.chat.entity.enums.ChannelType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateChannelRequest {

    @NotBlank(message = "Name cannot be blank")
    private String name;
    private ChannelType type;
    private Long serverId;
}