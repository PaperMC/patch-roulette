package io.papermc.patchroulette.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.papermc.patchroulette.model.Patch;
import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.PatchRouletteUser;
import io.papermc.patchroulette.service.PatchService;
import io.papermc.patchroulette.service.UserService;
import java.util.List;
import java.util.Optional;
import java.util.stream.StreamSupport;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RESTController {

    private final PatchService patchService;
    private final UserService userService;
    private final ObjectMapper mapper;

    @Autowired
    public RESTController(final PatchService patchService, final UserService userService) {
        this.patchService = patchService;
        this.userService = userService;
        this.mapper = new ObjectMapper();
    }

    @GetMapping(
        value = "/get-available-patches",
        consumes = "text/plain",
        produces = "application/json"
    )
    public ResponseEntity<JsonNode> getAvailablePatches(@RequestBody final String minecraftVersion) {
        try {
            final ArrayNode response = this.mapper.createArrayNode();
            final List<Patch> availablePatches = this.patchService.getAvailablePatches(minecraftVersion);
            for (final Patch patch : availablePatches) {
                response.add(patch.getPath());
            }
            return ResponseEntity.ok(response);
        } catch (final Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping(
        value = "/get-all-patches",
        consumes = "text/plain",
        produces = "application/json"
    )
    public ResponseEntity<JsonNode> getAllPatches(@RequestBody final String minecraftVersion) {
        try {
            final ArrayNode response = this.mapper.createArrayNode();
            final List<Patch> patches = this.patchService.getAllPatches(minecraftVersion);
            for (final Patch patch : patches) {
                final ObjectNode patchNode = this.mapper.createObjectNode();
                patchNode.put("path", patch.getPath());
                patchNode.put("status", patch.getStatus().name());
                patchNode.put(
                    "responsibleUser",
                    patch.getResponsibleUser() != null ? patch.getResponsibleUser().getUsername() : null
                );
                response.add(patchNode);
            }
            return ResponseEntity.ok(response);
        } catch (final Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(
        value = "/set-patches",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> setPatches(@RequestBody final String input) {
        try {
            final JsonNode tree = this.mapper.readTree(input);
            final String minecraftVersion = tree.get("minecraftVersion").asText();
            final List<String> paths = StreamSupport.stream(tree.get("paths").spliterator(), false)
                .map(JsonNode::asText)
                .toList();
            this.patchService.setPatches(minecraftVersion, paths);
            return ResponseEntity.ok("Patches set.");
        } catch (final Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping(
        value = "/clear-patches",
        consumes = "text/plain",
        produces = "text/plain"
    )
    public ResponseEntity<String> clearPatches(@RequestBody final String minecraftVersion) {
        try {
            this.patchService.clearPatches(minecraftVersion);
            return ResponseEntity.ok("Patches cleared.");
        } catch (final Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    private PatchRouletteUser getUser(final Authentication authentication) {
        final Optional<PatchRouletteUser> user = this.userService.getUserRepository()
            .findOneByToken(authentication.getCredentials().toString());
        return user.orElseThrow();
    }

    @PostMapping(
        value = "/start-patch",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> startPatch(final Authentication auth, @RequestBody final String input) {
        try {
            final PatchRouletteUser user = this.getUser(auth);
            final JsonNode tree = this.mapper.readTree(input);
            final String minecraftVersion = tree.get("minecraftVersion").asText();
            final String path = tree.get("path").asText();
            this.patchService.startWorkOnPatch(new PatchId(minecraftVersion, path), user);
            return ResponseEntity.ok("Patch started.");
        } catch (final Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping(
        value = "/complete-patch",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> completePatch(final Authentication auth, @RequestBody final String input) {
        try {
            final PatchRouletteUser user = this.getUser(auth);
            final JsonNode tree = this.mapper.readTree(input);
            final String minecraftVersion = tree.get("minecraftVersion").asText();
            final String path = tree.get("path").asText();
            this.patchService.finishWorkOnPatch(new PatchId(minecraftVersion, path), user);
            return ResponseEntity.ok("Patch finished.");
        } catch (final Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping(
        value = "/cancel-patch",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> cancelPatch(@RequestBody final String input) {
        try {
            final JsonNode tree = this.mapper.readTree(input);
            final String minecraftVersion = tree.get("minecraftVersion").asText();
            final String path = tree.get("path").asText();
            this.patchService.cancelWorkOnPatch(new PatchId(minecraftVersion, path));
            return ResponseEntity.ok("Patch cancelled.");
        } catch (final Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

}
