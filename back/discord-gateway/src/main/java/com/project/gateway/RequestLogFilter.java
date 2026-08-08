package com.project.gateway;

import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
public class RequestLogFilter implements WebFilter {

    @Override
    public Mono<Void> filter(
            ServerWebExchange exchange,
            WebFilterChain chain) {

        System.out.println(
                ">>> FRONTEND REQUEST RECEIVED: "
                + exchange.getRequest().getMethod()
                + " "
                + exchange.getRequest().getURI().getPath()
        );

        return chain.filter(exchange);
    }
}