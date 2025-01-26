package io.papermc.patchroulette.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

@Entity
public class PatchRouletteUser {
    @Id
    @GeneratedValue
    private long userId;

    private String username;

    private String token;

    public long getUserId() {
        return this.userId;
    }

    public void setUsername(final String username) {
        this.username = username;
    }

    public String getUsername() {
        return this.username;
    }

    public String getToken() {
        return this.token;
    }

    public void setToken(final String token) {
        this.token = token;
    }
}
