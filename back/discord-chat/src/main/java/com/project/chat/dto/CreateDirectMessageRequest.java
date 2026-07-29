package com.project.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateDirectMessageRequest {

    @NotBlank(message = "Target username cannot be blank")
    private String targetUsername;
}

