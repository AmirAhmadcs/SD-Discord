package com.project.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EditMessageRequest {

    @NotBlank(message = "Message content cannot be blank")
    private String content;
}