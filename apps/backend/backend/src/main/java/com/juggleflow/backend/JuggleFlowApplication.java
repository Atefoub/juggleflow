package com.juggleflow.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class JuggleFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(JuggleFlowApplication.class, args);
    }
}