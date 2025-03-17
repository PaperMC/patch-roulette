package io.papermc.patchroulette.controller;

import io.papermc.patchroulette.config.ApplicationConfig;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.Enumeration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

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

	@RequestMapping("/proxy/**")
	public ResponseEntity<byte[]> proxyGithubApi(final HttpServletRequest request) throws Exception {
		final String path = request.getRequestURI().replace("/api/github/proxy/", "");

		// Build URI with query parameters
		final UriComponentsBuilder uriBuilder = UriComponentsBuilder
				.fromUriString("https://api.github.com/" + path);

		// Copy query parameters
		request.getParameterMap().forEach(uriBuilder::queryParam);
		final URI githubUri = uriBuilder.build().toUri();

		// Copy all headers from incoming request
		final HttpHeaders headers = new HttpHeaders();
		final Enumeration<String> headerNames = request.getHeaderNames();
		while (headerNames.hasMoreElements()) {
			final String headerName = headerNames.nextElement();
			headers.add(headerName, request.getHeader(headerName));
		}

		// Decrypt Authorization header
		final ResponseEntity<byte[]> decryptFail = this.decryptToken(headers);
		if (decryptFail != null) {
			return decryptFail;
		}

		// Create request entity with headers and body (if any)
		final RequestEntity<?> requestEntity;
		if (request.getContentLength() > 0) {
			requestEntity = new RequestEntity<>(request.getInputStream().readAllBytes(), headers, HttpMethod.valueOf(request.getMethod()), githubUri);
		} else {
			requestEntity = new RequestEntity<>(headers, HttpMethod.valueOf(request.getMethod()), githubUri);
		}

		// Execute the request and return response
		return this.restTemplate.exchange(requestEntity, byte[].class);
	}

	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}

	private <T> ResponseEntity<T> decryptToken(final HttpHeaders headers) {
		String authorization = headers.getFirst(HttpHeaders.AUTHORIZATION);
		if (authorization == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		authorization = this.encryptor.decrypt(authorization.substring("Bearer ".length()));
		headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + authorization);
		return null;
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
