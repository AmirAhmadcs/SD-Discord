package com.project.auth.controller;

import com.project.auth.entity.UserProfile;
import com.project.auth.repository.UserProfileRepository;
import com.project.auth.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/internal")
@RequiredArgsConstructor
public class InternalController {

    private final UserProfileRepository userProfileRepository;
    private final UserService userService;


    @GetMapping("/{username}/exists")
    public ResponseEntity<Boolean> checkUserExistsInternal(@PathVariable String username) {
        boolean exists = userProfileRepository.existsByUsername(username);
        return ResponseEntity.ok(exists);
    }

    /**
     * اندپوینت داخلی برای ماژول چت - چک کردن اینکه آیا کاربر اجازه اضافه شدن به سرور رو داره یا
     * خیر
     */
    @GetMapping("/{username}/allow-group-add")
    public ResponseEntity<Boolean> isAllowedToBeAddedToGroups(@PathVariable String username) {
        // فرض میکنیم تو UserProfile یه فیلد boolean به اسم allowGroupAdditions داری
        // اگه نداری باید اول به Entity اضافه کنی و اینجا رو بخونی
        UserProfile profile = userService.getProfile(username);
        return ResponseEntity.ok(profile.isAllowGroupAdditions());
    }
}