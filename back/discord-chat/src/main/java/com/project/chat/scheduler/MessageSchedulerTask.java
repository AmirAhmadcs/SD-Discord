package com.project.chat.scheduler;

import com.project.chat.entity.Message;
import com.project.chat.entity.enums.MessageStatus;
import com.project.chat.repository.ChannelRepository;
import com.project.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class MessageSchedulerTask {

    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final SimpMessagingTemplate messagingTemplate; // از این برای پخش کردن پیام استفاده میکنیم

    // هر 5 ثانیه یکبار اجرا می‌شود
    @Scheduled(fixedRate = 5000)
    @Transactional
    public void processScheduledMessages() {
        long now = System.currentTimeMillis();
        List<Message> messagesToSend = messageRepository.findByStatusAndScheduledAtBefore(MessageStatus.SCHEDULED, now);

        for (Message message : messagesToSend) {
            // منطق شما: اگه گروه پاک شده بود پیام لغو شود
            if (message.getChannel() == null || message.getChannel().getServer() == null || !channelRepository.existsById(message.getChannel().getId())) {
                message.setStatus(MessageStatus.CANCELED);
                messageRepository.save(message);
                continue;
            }

            // تغییر وضعیت به ارسال شده
            message.setStatus(MessageStatus.SENT);
            message.setCreatedAt(System.currentTimeMillis()); // زمان واقعی ارسال ثبت میشود
            messageRepository.save(message);

            // پخش شدن پیام در وب‌سوکت (دقیقا مثل کانتورلر وب‌سوکت شما)
            var payload = new com.project.common.dto.LiveMessagePayload();
            payload.setContent(message.getContent());
            payload.setSenderUsername(message.getSenderUsername());
            payload.setChannelId(message.getChannel().getId());
            payload.setAttachmentFileName(message.getAttachmentFileName());
            payload.setCreatedAt(message.getCreatedAt());

            messagingTemplate.convertAndSend("/topic/channel/" + message.getChannel().getId(), payload);
        }
    }
}