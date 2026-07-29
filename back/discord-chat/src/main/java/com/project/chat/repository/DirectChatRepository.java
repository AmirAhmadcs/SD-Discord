package com.project.chat.repository;

import com.project.chat.entity.DirectChat;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DirectChatRepository extends JpaRepository<DirectChat, Long> {

    // پیدا کردن DM بین دو نفر (مرتب بودن اسم‌ها مهم نیست، پس دو تا کوئری می‌نویسیم)
    Optional<DirectChat> findByParticipantOneAndParticipantTwo(String user1, String user2);

    Optional<DirectChat> findByParticipantTwoAndParticipantOne(String user1, String user2);

    // ⬇️ این متدی هست که برای بخش خواندن پیام‌ها (MessageService) بهش نیاز داریم ⬇️
    Optional<DirectChat> findByChannelId(Long channelId);
}