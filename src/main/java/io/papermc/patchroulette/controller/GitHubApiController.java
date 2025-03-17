package io.papermc.patchroulette.controller;

import io.papermc.patchroulette.config.ApplicationConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
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

	@Autowired
	public GitHubApiController(final ApplicationConfig config) {
		this.restTemplate = new RestTemplate();
		this.config = config;
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
	) {}

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

		final ResponseEntity<GithubTokenResponse> response = this.restTemplate.exchange(
				GITHUB_TOKEN_ENDPOINT,
				HttpMethod.POST,
				new HttpEntity<>(requestBody, headers),
				GithubTokenResponse.class
		);

		return ResponseEntity.status(response.getStatusCode())
				.body(response.getBody());
	}
}
