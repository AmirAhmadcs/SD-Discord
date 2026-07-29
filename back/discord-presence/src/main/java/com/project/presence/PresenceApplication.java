package com.project.presence;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient // ✅ ضروری است تا گیت‌وی بتواند این سرویس را پیدا کند
public class PresenceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PresenceApplication.class, args);
    }
}