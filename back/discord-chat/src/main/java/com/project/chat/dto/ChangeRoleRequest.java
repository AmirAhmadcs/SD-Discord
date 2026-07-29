package com.project.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeRoleRequest {

    @NotBlank(message = "Target username is required")
    private String targetUsername;

    @NotNull(message = "New role ID is required")
    private Long newRoleId;
}