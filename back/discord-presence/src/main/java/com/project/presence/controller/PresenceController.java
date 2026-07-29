package com.project.presence.controller;

import com.project.presence.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @PostMapping("/online")
    public ResponseEntity<Void> goOnline(@AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        presenceService.setUserOnline(username);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/offline")
    public ResponseEntity<Void> goOffline(@AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        presenceService.setUserOffline(username);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/voice/join/{channelId}")
    public ResponseEntity<Void> joinVoice(@PathVariable Long channelId, @AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        presenceService.joinVoiceChannel(username, channelId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/voice/leave/{channelId}")
    public ResponseEntity<Void> leaveVoice(@PathVariable Long channelId, @AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        presenceService.leaveVoiceChannel(username, channelId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/voice/members/{channelId}")
    public ResponseEntity<java.util.Set<String>> getVoiceMembers(@PathVariable Long channelId) {
        return ResponseEntity.ok(presenceService.getUsersInVoiceChannel(channelId));
    }
}