package com.project.voice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String VOICE_EXCHANGE = "voice.exchange";
    public static final String VOICE_QUEUE = "voice.queue";
    public static final String VOICE_ROUTING_KEY = "voice.signaling";

    @Bean
    public DirectExchange voiceExchange() { return new DirectExchange(VOICE_EXCHANGE); }

    @Bean
    public Queue voiceQueue() { return new Queue(VOICE_QUEUE); }

    @Bean
    public Binding voiceBinding() {
        return BindingBuilder.bind(voiceQueue()).to(voiceExchange()).with(VOICE_ROUTING_KEY);
    }
}