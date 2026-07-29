package com.project.presence.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String PRESENCE_EXCHANGE = "presence.exchange";
    public static final String PRESENCE_QUEUE = "presence.queue";
    public static final String PRESENCE_ROUTING_KEY = "presence.events";

    @Bean
    public DirectExchange presenceExchange() {
        return new DirectExchange(PRESENCE_EXCHANGE);
    }

    @Bean
    public Queue presenceQueue() {
        return new Queue(PRESENCE_QUEUE);
    }

    @Bean
    public Binding presenceBinding() {
        return BindingBuilder.bind(presenceQueue()).to(presenceExchange()).with(PRESENCE_ROUTING_KEY);
    }
}