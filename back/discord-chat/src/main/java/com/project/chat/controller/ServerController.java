package com.project.chat.controller;

import com.project.chat.dto.AddMemberRequest;
import com.project.chat.dto.CreateServerRequest;
import com.project.chat.dto.UpdateNameRequest;
import com.project.chat.entity.Server;
import com.project.chat.entity.ServerMember;
import com.project.chat.service.ServerService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/servers")
@RequiredArgsConstructor
public class ServerController {

    private final ServerService serverService;

    @PostMapping
    public ResponseEntity<Server> createServer(
        @RequestBody CreateServerRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");

        Server savedServer = serverService.createServer(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedServer);
    }

    @GetMapping
    public ResponseEntity<List<Server>> getMyServers(@AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        List<Server> servers = serverService.getUserServers(username);
        return ResponseEntity.ok(servers);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Server> getServer(@PathVariable Long id) {
        return ResponseEntity.ok(serverService.getServerById(id));
    }

    @PostMapping("/{serverId}/members")
    public ResponseEntity<ServerMember> addMember(
        @PathVariable Long serverId,
        @RequestBody AddMemberRequest request) {

        ServerMember addedMember = serverService.addMemberToServer(serverId, request.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(addedMember);
    }

    // ... متدهای قبلی ...

    /**
     * استوری 6-1: ویرایش اسم گروه (سرور) - فقط اعضا
     */
    @PutMapping("/{id}/name")
    public ResponseEntity<Server> updateServerName(
        @PathVariable Long id,
        @Valid @RequestBody UpdateNameRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        Server updatedServer = serverService.updateServerName(id, request.getName(), username);
        return ResponseEntity.ok(updatedServer);
    }

    /**
     * استوری 6-2: حذف گروه (سرور) - هر عضوی می‌تونه حذف کنه!
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteServer(
        @PathVariable Long id,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        serverService.deleteServer(id, username);
        return ResponseEntity.ok().build();
    }

    /**
     * لفت دادن از سرور - هرکسی میتونه لفت بده به جز اونر
     */
    @DeleteMapping("/{serverId}/leave")
    public ResponseEntity<Void> leaveServer(
        @PathVariable Long serverId,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        serverService.leaveServer(serverId, username);
        return ResponseEntity.ok().build();
    }

    /**
     * بن کردن (اخراج دائمی) عضو از سرور
     */
    @PostMapping("/{serverId}/members/{targetUsername}/ban")
    public ResponseEntity<Void> banMember(
        @PathVariable Long serverId,
        @PathVariable String targetUsername,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        serverService.banMember(serverId, targetUsername, username);
        return ResponseEntity.ok().build();
    }
}