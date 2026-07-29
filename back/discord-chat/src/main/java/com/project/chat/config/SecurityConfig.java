package com.project.chat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // چون API هستیم غیرفعالش می‌کنیم
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated() // همه درخواست‌ها نیاز به توکن دارن
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {
            })); // توکن‌ها رو به روش JWT بررسی کن

        return http.build();
    }
}