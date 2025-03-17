package io.papermc.patchroulette.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.papermc.patchroulette.config.ApplicationConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/github")
public class GitHubApiController {

    private static final String GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";

    private final RestTemplate restTemplate;
    private final ApplicationConfig config;
    private final TextEncryptor encryptor;

    @Autowired
    public GitHubApiController(final ApplicationConfig config) {
        this.restTemplate = new RestTemplate();
        this.config = config;
        this.encryptor = Encryptors.text(this.config.githubTokenPassword(), this.config.githubTokenSalt());
    }

    public record GithubTokenRequest(
        String client_id,
        String client_secret,
        String code,
        String state
    ) {}

    public record GithubTokenResponse(
        String access_token,
        String token_type,
        String scope,
        Integer expires_in
    ) {
        public GithubTokenResponse withToken(String token) {
            return new GithubTokenResponse(token, this.token_type, this.scope, this.expires_in);
        }
    }

    @GetMapping("/pr")
    public ResponseEntity<JsonNode> getPullRequest(
        final HttpHeaders headers,
        @RequestHeader("Authorization") final String authorization,
        @RequestParam("owner") final String owner,
        @RequestParam("repo") final String repo,
        @RequestParam("id") final String id,
        @RequestParam("page") final int page
    ) {
        final ResponseEntity<JsonNode> failedToDecrypt = this.decryptToken(headers, authorization);
        if (failedToDecrypt != null) {
            return failedToDecrypt;
        }
        headers.set("Accept", "application/vnd.github+json");
        return this.proxyGitHubApiRequest(
            "/repos/" + owner + "/" + repo + "/pulls/" + id + "/files?per_page=100&page=" + page,
            HttpMethod.GET,
            null,
            headers,
            JsonNode.class
        );
    }

    @GetMapping("/commit")
    public ResponseEntity<String> getCommit(
        final HttpHeaders headers,
        @RequestHeader("Authorization") final String authorization,
        @RequestParam("owner") final String owner,
        @RequestParam("repo") final String repo,
        @RequestParam("id") final String id
    ) {
        final ResponseEntity<String> failedToDecrypt = this.decryptToken(headers, authorization);
        if (failedToDecrypt != null) {
            return failedToDecrypt;
        }
        headers.set("Accept", "application/vnd.github.v3.diff");
        return this.proxyGitHubApiRequest(
            "/repos/" + owner + "/" + repo + "/commits/" + id,
            HttpMethod.GET,
            null,
            headers,
            String.class
        );
    }

    @GetMapping("/user")
    public ResponseEntity<JsonNode> getUser(
        final HttpHeaders headers,
        @RequestHeader("Authorization") final String authorization
    ) {
        final ResponseEntity<JsonNode> failedToDecrypt = this.decryptToken(headers, authorization);
        if (failedToDecrypt != null) {
            return failedToDecrypt;
        }
        return this.proxyGitHubApiRequest(
            "/user",
            HttpMethod.GET,
            null,
            headers,
            JsonNode.class
        );
    }

    private <T> ResponseEntity<T> decryptToken(final HttpHeaders headers, String authorization) {
        if (authorization == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authorization = this.encryptor.decrypt(authorization.substring("Bearer ".length()));
        headers.set("Authorization", "Bearer " + authorization);
        return null;
    }

    private <B, T> ResponseEntity<T> proxyGitHubApiRequest(
        final String path,
        final HttpMethod method,
        final B body,
        final HttpHeaders headers,
        final Class<T> responseType
    ) {
        final HttpEntity<B> requestEntity = new HttpEntity<>(body, headers);
        return this.restTemplate.exchange(
            "https://api.github.com" + path,
            method,
            requestEntity,
            responseType
        );
    }

    @PostMapping("/token")
    public ResponseEntity<GithubTokenResponse> getAccessToken(
        @RequestParam("code") String code,
        @RequestParam(value = "state", required = false) String state
    ) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("Accept", "application/json");

        final GithubTokenRequest requestBody = new GithubTokenRequest(
            this.config.githubClientId(), this.config.githubClientSecret(), code, state);

        final HttpEntity<GithubTokenRequest> requestEntity = new HttpEntity<>(requestBody, headers);

        final ResponseEntity<GithubTokenResponse> response = this.restTemplate.exchange(
            GITHUB_TOKEN_ENDPOINT,
            HttpMethod.POST,
            requestEntity,
            GithubTokenResponse.class
        );

        if (response.getStatusCode() == HttpStatus.OK) {
            final GithubTokenResponse body = response.getBody();
            if (body != null) {
                final String token = response.getBody().access_token;
                final String encryptedToken = this.encryptor.encrypt(token);
                return ResponseEntity
                    .status(response.getStatusCode())
                    .body(response.getBody().withToken(encryptedToken));
            }
        }

        return ResponseEntity
            .status(response.getStatusCode())
            .body(response.getBody());
    }
}
