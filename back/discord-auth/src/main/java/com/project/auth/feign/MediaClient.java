package com.project.auth.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "DISCORD-MEDIA", path = "/api/internal/media")
public interface MediaClient {

    @DeleteMapping("/{fileName}")
    void deleteFile(@PathVariable("fileName") String fileName);
}