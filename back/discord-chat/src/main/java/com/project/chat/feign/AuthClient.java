package com.project.chat.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "DISCORD-AUTH")
public interface AuthClient {

    @GetMapping("/api/v1/users/internal/{username}/exists")
    boolean checkUserExists(@PathVariable("username") String username);

    @GetMapping("/api/v1/users/internal/{username}/allow-group-add")
    boolean isAllowedToBeAddedToGroups(@PathVariable("username") String username);
}