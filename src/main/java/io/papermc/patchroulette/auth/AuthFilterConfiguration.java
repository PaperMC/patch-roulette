package io.papermc.patchroulette.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class AuthFilterConfiguration {

    private final AuthFilter authFilter;

    @Autowired
    public AuthFilterConfiguration(AuthFilter authFilter) {
        this.authFilter = authFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(final HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(authorizeRequests -> {
            authorizeRequests.anyRequest().authenticated();
        });
        http.addFilterBefore(this.authFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
