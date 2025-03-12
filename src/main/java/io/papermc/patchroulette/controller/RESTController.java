package io.papermc.patchroulette.controller;

import io.papermc.patchroulette.model.Patch;
import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.service.PatchService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RESTController {

    private final PatchService patchService;

    @Autowired
    public RESTController(final PatchService patchService) {
        this.patchService = patchService;
    }

    @PreAuthorize("hasRole('PATCH')")
    @GetMapping(
        value = "/get-available-patches",
        produces = "application/json"
    )
    public ResponseEntity<List<String>> getAvailablePatches(@RequestParam final String minecraftVersion) {
        return ResponseEntity.ok(
            this.patchService.getAvailablePatches(minecraftVersion).stream()
                .map(Patch::getPath)
                .toList()
        );
    }

    public record PatchDetails(String path, String status, String responsibleUser) {}

    @PreAuthorize("hasRole('PATCH')")
    @GetMapping(
        value = "/get-all-patches",
        produces = "application/json"
    )
    public ResponseEntity<List<PatchDetails>> getAllPatches(@RequestParam final String minecraftVersion) {
        return ResponseEntity.ok(
            this.patchService.getAllPatches(minecraftVersion).stream()
                .map(patch -> new PatchDetails(patch.getPath(), patch.getStatus().name(), patch.getResponsibleUser()))
                .toList()
        );
    }

    public record Patches(String minecraftVersion, List<String> paths) {}

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
        value = "/set-patches",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> setPatches(@RequestBody final Patches input) {
        this.patchService.setPatches(input.minecraftVersion(), input.paths());
        return ResponseEntity.ok("Patches set.");
    }

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
        value = "/clear-patches",
        consumes = "text/plain",
        produces = "text/plain"
    )
    public ResponseEntity<String> clearPatches(@RequestBody final String minecraftVersion) {
        this.patchService.clearPatches(minecraftVersion);
        return ResponseEntity.ok("Patches cleared.");
    }

    private String getUser(final Authentication authentication) {
        return authentication.getName();
    }

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
        value = "/start-patch",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> startPatch(final Authentication auth, @RequestBody final PatchId input) {
        final String user = this.getUser(auth);
        final List<String> result = this.patchService.startWorkOnPatches(input.getMinecraftVersion(), List.of(input.getPath()), user);
        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Patch not available.");
        }
        return ResponseEntity.ok("Patch started.");
    }

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
            value = "/start-patches",
            consumes = "application/json",
            produces = "application/json"
    )
    public ResponseEntity<?> startPatch(final Authentication auth, @RequestBody final Patches input) {
        final String user = this.getUser(auth);
        final List<String> result = this.patchService.startWorkOnPatches(input.minecraftVersion(), input.paths(), user);
        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("None of the patches are available.");
        }
        return ResponseEntity.ok(result);
    }

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
        value = "/complete-patch",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> completePatch(final Authentication auth, @RequestBody final PatchId input) {
        final String user = this.getUser(auth);
        this.patchService.finishWorkOnPatch(input, user);
        return ResponseEntity.ok("Patch finished.");
    }

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
        value = "/cancel-patch",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> cancelPatch(@RequestBody final PatchId input) {
        this.patchService.cancelWorkOnPatch(input);
        return ResponseEntity.ok("Patch cancelled.");
    }

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
            value = "/undo-patch",
            consumes = "application/json",
            produces = "text/plain"
    )
    public ResponseEntity<String> undoPatch(final Authentication auth, @RequestBody final PatchId input) {
        final String user = this.getUser(auth);
        this.patchService.undoPatch(input, user);
        return ResponseEntity.ok("Patch moved to WIP.");
    }

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
		value = "/login",
		produces = "text/plain"
    )
	public ResponseEntity<String> login() {
		return ResponseEntity.ok("Your credentials are valid.");
	}

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleException(final IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
    }
}
