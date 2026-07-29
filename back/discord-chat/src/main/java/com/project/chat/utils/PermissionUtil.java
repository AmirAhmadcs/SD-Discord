package com.project.chat.utils;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.chat.entity.Role;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class PermissionUtil {

    private final ObjectMapper objectMapper;

    public PermissionUtil(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * چک میکند که آیا یک نقش، دسترسی خاصی را دارد یا خیر
     */
    public boolean hasPermission(Role role, String requiredPermission) {
        if (role == null || role.getPermissionsJson() == null) {
            return false;
        }

        try {
            List<String> permissions = objectMapper.readValue(
                role.getPermissionsJson(),
                new TypeReference<List<String>>() {}
            );

            // اگر "*" باشد یعنی اونر است و همه دسترسی ها را دارد
            if (permissions.contains("*")) {
                return true;
            }

            return permissions.contains(requiredPermission);
        } catch (Exception e) {
            log.error("Error parsing permissions JSON for role {}: {}", role.getName(), e.getMessage());
            return false; // در صورت خطای json، دسترسی را قطع میکنیم (امنیت)
        }
    }
}