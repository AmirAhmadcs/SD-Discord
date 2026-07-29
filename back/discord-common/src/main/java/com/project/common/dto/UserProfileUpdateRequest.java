package com.project.common.dto;

import java.util.List;
import lombok.Data;

@Data
public class UserProfileUpdateRequest {
    private String username;
    private String firstName;
    private String lastName;
    private String bio;
    private List<String> avatarUrls;
    private boolean allowGroupAdditions = true;
}