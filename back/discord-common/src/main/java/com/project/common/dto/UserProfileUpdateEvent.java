package com.project.common.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileUpdateEvent {

    private String username;
    private String firstName;
    private String lastName;
    private List<String> avatarUrls;
    private String bio;
}