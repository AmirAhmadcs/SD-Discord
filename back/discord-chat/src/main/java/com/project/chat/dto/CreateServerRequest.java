package com.project.chat.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.Data;

@Data
public class CreateServerRequest {

    @NotBlank(message = "Server name cannot be blank")
    private String name;

    private String iconUrl;

    private List<String> initialMemberUsernames;
}