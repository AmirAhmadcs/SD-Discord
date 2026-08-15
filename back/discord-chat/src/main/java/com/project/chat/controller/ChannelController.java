package com.project.chat.controller;

import com.project.chat.dto.ChangeRoleRequest;
import com.project.chat.dto.CreateChannelRequest;
import com.project.chat.dto.UpdateNameRequest;
import com.project.chat.entity.Channel;
import com.project.chat.service.ChannelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;

    @PostMapping
    public ResponseEntity<Channel> createChannel(@RequestBody CreateChannelRequest request,
        @AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(channelService.createChannel(request, username));
    }

    /**
     * استوری 4-2: تغییر نقش کاربران
     */
    @PutMapping("/{channelId}/members/role")
    public ResponseEntity<Void> changeMemberRole(
        @PathVariable Long channelId,
        @Valid @RequestBody ChangeRoleRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        channelService.changeMemberRole(channelId, request, username);
        return ResponseEntity.ok().build();
    }

    /**
     * استوری 6-3: ویرایش اسم کانال - فقط مدیران
     */
    @PutMapping("/{channelId}/name")
    public ResponseEntity<Channel> updateChannelName(
        @PathVariable Long channelId,
        @Valid @RequestBody UpdateNameRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        Channel updatedChannel = channelService.updateChannelName(channelId, request.getName(),
            username);
        return ResponseEntity.ok(updatedChannel);
    }

    /**
     * استوری 6-4: حذف کانال - فقط مدیران
     */
    @DeleteMapping("/{channelId}")
    public ResponseEntity<Void> deleteChannel(
        @PathVariable Long channelId,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        channelService.deleteChannel(channelId, username);
        return ResponseEntity.ok().build();
    }

    /**
     * استوری 7-2: فعال/غیرفعال کردن محدودیت ارسال رسانه توسط مدیران
     */
    @PutMapping("/{channelId}/media-restriction")
    public ResponseEntity<Void> toggleMediaRestriction(
        @PathVariable Long channelId,
        @RequestParam boolean isRestricted,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        channelService.toggleMediaRestriction(channelId, isRestricted, username);
        return ResponseEntity.ok().build();
    }
}