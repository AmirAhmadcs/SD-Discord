package com.project.chat.service;

import com.project.chat.dto.CreateDirectMessageRequest;
import com.project.chat.entity.Channel;
import com.project.chat.entity.DirectChat;
import com.project.chat.entity.enums.ChannelType;
import com.project.chat.feign.AuthClient;
import com.project.chat.repository.ChannelRepository;
import com.project.chat.repository.DirectChatRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DirectMessageService {

    private final DirectChatRepository directChatRepository;
    private final ChannelRepository channelRepository;
    private final AuthClient authClient; // برای چک کردن اینکه آیا کاربر اصلا وجود داره

    @Transactional
    public Channel getOrCreateDirectChannel(String requesterUsername,
        CreateDirectMessageRequest request) {
        String targetUsername = request.getTargetUsername();

        if (requesterUsername.equals(targetUsername)) {
            throw new RuntimeException("You cannot start a chat with yourself!");
        }

        // 1. چک میکنیم آیا اصلا همچین کاربری تو سیستم هست؟ (استفاده از فیگن کلاینت شما)
        boolean userExists = authClient.checkUserExists(targetUsername);
        if (!userExists) {
            throw new RuntimeException("User not found!");
        }

        // 2. چک میکنیم آیا قبلاً بین این دو نفر DM باز شده یا نه؟
        Optional<DirectChat> existingChat = directChatRepository.findByParticipantOneAndParticipantTwo(
            requesterUsername, targetUsername);
        if (existingChat.isEmpty()) {
            existingChat = directChatRepository.findByParticipantTwoAndParticipantOne(
                requesterUsername, targetUsername);
        }

        // 3. اگر وجود داشت، همون کانال قبلی رو برمی‌گردونیم
        if (existingChat.isPresent()) {
            return existingChat.get().getChannel();
        }

        // 4. اگر نبود، یک کانال جدید از نوع DIRECT می‌سازیم (بدون سرور)
        Channel newDmChannel = Channel.builder()
            .name("DM") // تو دیسکورد اسم کانال DM مهم نیست، فرانت اسم طرف مقابل رو نشون میده
            .type(ChannelType.DIRECT)
            .server(null) // سرور نداریم
            .build();

        newDmChannel = channelRepository.save(newDmChannel);

        // 5. رکورد واسط رو تو جدول direct_chats می‌سازیم
        DirectChat directChat = DirectChat.builder()
            .channel(newDmChannel)
            .participantOne(requesterUsername)
            .participantTwo(targetUsername)
            .build();

        directChatRepository.save(directChat);

        return newDmChannel;
    }
}

