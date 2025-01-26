package io.papermc.patchroulette.auth;

import io.papermc.patchroulette.model.PatchRouletteUser;
import io.papermc.patchroulette.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.filter.OncePerRequestFilter;

@Service
public class AuthFilter extends OncePerRequestFilter {

    private final UserService userService;

    @Autowired
    public AuthFilter(final UserService userService) {
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(
        final HttpServletRequest request,
        final HttpServletResponse response,
        final FilterChain filterChain
    ) throws ServletException, IOException {
        final String token = request.getHeader("Authentication-Token");

        if (token == null) {
            response.setStatus(401);
            return;
        }

        final Optional<PatchRouletteUser> user = this.userService.getUserRepository().findOneByToken(token);
        if (user.isEmpty()) {
            response.setStatus(401);
            return;
        }
        final var authentication = new UsernamePasswordAuthenticationToken(
            user.get().getUsername(),
            token,
            List.of(new SimpleGrantedAuthority("ROLE_PATCH"))
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}
