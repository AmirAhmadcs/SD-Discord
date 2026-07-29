package com.project.chat.controller;

import com.project.chat.dto.CreateTopicRequest;
import com.project.chat.entity.Topic;
import com.project.chat.service.TopicService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/topics")
@RequiredArgsConstructor
public class TopicController {

    private final TopicService topicService;

    /**
     * استوری 4-3: ساخت تاپیک
     */
    @PostMapping
    public ResponseEntity<Topic> createTopic(
        @Valid @RequestBody CreateTopicRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(topicService.createTopic(request, username));
    }

    /**
     * استوری 4-4: حذف تاپیک
     */
    @DeleteMapping("/{topicId}")
    public ResponseEntity<Void> deleteTopic(
        @PathVariable Long topicId,
        @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        topicService.deleteTopic(topicId, username);
        return ResponseEntity.ok().build();
    }
}