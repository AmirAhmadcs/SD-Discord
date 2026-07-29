package com.project.chat.repository;

import com.project.chat.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    // برای پیدا کردن نقش‌های پیش‌فرض یک سرور (مثلا پیدا کردن نقش MEMBER در یک سرور خاص)
    Optional<Role> findByServerIdAndName(Long serverId, String name);

    // برای پیدا کردن یک نقش با آیدی (برای تغییر نقش کاربران)
    Optional<Role> findByIdAndServerId(Long roleId, Long serverId);
}