package io.papermc.patchroulette.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("application")
public record ApplicationConfig(List<String> allowedOrigins) {
}
