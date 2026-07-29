package com.project.media.controller;

import com.project.media.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/internal/media")
@RequiredArgsConstructor
public class InternalController {

    private final MediaService mediaService;

    // این روت فقط و فقط توسط ماژول‌های دیگه (مثل Chat) صدا زده میشه
    @DeleteMapping("/{fileName}")
    public ResponseEntity<Void> deleteFile(@PathVariable String fileName) {
        mediaService.deleteFile(fileName);
        return ResponseEntity.ok().build();
    }
}