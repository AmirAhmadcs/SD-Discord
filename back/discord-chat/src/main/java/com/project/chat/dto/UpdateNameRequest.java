package com.project.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateNameRequest {

    @NotBlank(message = "Name cannot be blank")
    private String name;
}