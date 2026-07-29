package com.project.chat.service;

import com.project.chat.entity.Channel;
import com.project.chat.entity.Message;
import com.project.chat.repository.ChannelRepository;
import com.project.chat.repository.MessageRepository;
import com.project.common.dto.LiveMessagePayload;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatMessageConsumer {

    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;

    @RabbitListener(bindings = @QueueBinding(
        value = @Queue(value = "chat.message.queue", durable = "true"),
        exchange = @Exchange(value = "chat.exchange"),
        key = "chat.message.save"
    ))
    public void consumeAndSaveMessage(LiveMessagePayload payload) {
        Channel channel = channelRepository.findById(payload.getChannelId())
            .orElseThrow(() -> new RuntimeException("کانال پیدا نشد!"));

        // تو بیلد کردن پیام، فیلد attachmentFileName رو هم پاس می‌دیم
        Message message = Message.builder()
            .content(payload.getContent())
            .senderUsername(payload.getSenderUsername())
            .channel(channel)
            .attachmentFileName(payload.getAttachmentFileName()) // 👈 اضافه شد
            .build();

        messageRepository.save(message);
    }
}