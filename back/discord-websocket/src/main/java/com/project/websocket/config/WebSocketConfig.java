package com.project.websocket.config;

import com.project.websocket.interceptor.AuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AuthChannelInterceptor authChannelInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // نقطه‌ای که فرانت‌اند بهش وصل میشه: ws://localhost:8000/ws
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*"); // اجازه اتصال از همه دامنه‌ها (برای محیط لوکال)
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // وصل کردن اسپرینگ‌بوت به پروتکل STOMP داخل RabbitMQ
        registry.enableStompBrokerRelay("/topic", "/queue")
            .setRelayHost("localhost")
            .setRelayPort(61613) // پورت STOMP ربیت‌ام‌کیو
            .setClientLogin("guest")
            .setClientPasscode("guest")
            .setSystemLogin("guest")
            .setSystemPasscode("guest");

        // پیشوندی که فرانت‌اند برای فرستادن پیام به سرور استفاده می‌کنه
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // قرار دادن نگهبان امنیتی (اینترسپتور) سر راه کانال ورودی
        registration.interceptors(authChannelInterceptor);
    }
}