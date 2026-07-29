package com.project.websocket.feign;

import com.project.common.dto.LiveMessagePayload;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "chat-service", url = "${chat.service.url:http://localhost:8082}")
public interface ChatClient {

    // اندپوینتی که قرار است در discord-chat بسازیم
    @PostMapping("/api/v1/messages/ws-sync")
    LiveMessagePayload saveAndSyncMessage(@RequestBody LiveMessagePayload payload);
}