package io.papermc.patchroulette;

import io.papermc.patchroulette.config.ApplicationConfig;
import io.papermc.patchroulette.model.PatchRouletteUser;
import io.papermc.patchroulette.service.UserService;
import jakarta.annotation.PostConstruct;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@EnableConfigurationProperties(ApplicationConfig.class)
@SpringBootApplication
public class Application {

    private static final Logger LOGGER = LoggerFactory.getLogger(Application.class);

    public static void main(final String[] args) {
        SpringApplication.run(Application.class, args);
    }

    private final ApplicationConfig config;
    private final UserService userService;

    @Autowired
    public Application(final ApplicationConfig config, final UserService userService) {
        this.config = config;
        this.userService = userService;
    }

    @PostConstruct
    public void init() {
        for (final String username : this.config.usernames()) {
            PatchRouletteUser user = this.userService.getUserRepository().findOneByUsername(username).orElse(null);
            if (user == null) {
                user = new PatchRouletteUser();
                user.setUsername(username);
                user.setToken(UUID.randomUUID().toString());
                LOGGER.info("Creating new user '{}' with token '{}'", username, user.getToken());
                this.userService.getUserRepository().save(user);
            }
        }
        for (final PatchRouletteUser user : this.userService.getUserRepository().findAll()) {
            if (!this.config.usernames().contains(user.getUsername())) {
                // Removed user no longer allowed to authenticate
                user.setToken(null);
                this.userService.getUserRepository().save(user);
            }
        }
    }
}
