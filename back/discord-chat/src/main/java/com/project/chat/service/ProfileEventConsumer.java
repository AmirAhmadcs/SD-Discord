package com.project.chat.service;

import com.project.common.dto.UserProfileUpdateEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProfileEventConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    @RabbitListener(bindings = @QueueBinding(
        value = @Queue(value = "chat.profile.queue", durable = "true"),
        exchange = @Exchange(value = "profile.exchange"),
        key = "profile.updated"
    ))
    public void handleProfileUpdateEvent(UserProfileUpdateEvent event) {
        log.info("Received profile update event for user: {}", event.getUsername());

        // فرستادن اطلاعات جدید پروفایل به یک تاپیک اختصاصی آنلاین
        // هر جایی تو فرانتند که این یوزرنیم رو نشون میده (لیست سرور، چت خصوصی، کانال)
        // باید روی این تاپیک سابسکرایب باشه
        messagingTemplate.convertAndSend(
            "/topic/users/" + event.getUsername() + "/profile",
            event
        );
    }
}