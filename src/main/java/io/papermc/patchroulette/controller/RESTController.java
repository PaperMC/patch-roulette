package io.papermc.patchroulette.controller;

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

    public record PatchInfo(String path, Integer size) {}

    @PreAuthorize("hasRole('PATCH')")
    @GetMapping(
        value = "/get-available-patches",
        produces = "application/json"
    )
    public ResponseEntity<List<PatchInfo>> getAvailablePatches(@RequestParam final String minecraftVersion) {
        return ResponseEntity.ok(
            this.patchService.getAvailablePatches(minecraftVersion).stream()
                .map(patch -> new PatchInfo(patch.getPath(), patch.getSize()))
                .toList()
        );
    }

    public record PatchDetails(String path, String status, String responsibleUser, Integer size) {}

    @PreAuthorize("hasRole('PATCH')")
    @GetMapping(
        value = "/get-all-patches",
        produces = "application/json"
    )
    public ResponseEntity<List<PatchDetails>> getAllPatches(@RequestParam final String minecraftVersion) {
        return ResponseEntity.ok(
            this.patchService.getAllPatches(minecraftVersion).stream()
                .map(patch -> new PatchDetails(patch.getPath(), patch.getStatus().name(), patch.getResponsibleUser(), patch.getSize()))
                .toList()
        );
    }

    public record Patches(String minecraftVersion, List<PatchInfo> patches) {}

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
        value = "/set-patches",
        consumes = "application/json",
        produces = "text/plain"
    )
    public ResponseEntity<String> setPatches(@RequestBody final Patches input) {
        this.patchService.setPatches(input.minecraftVersion(), input.patches());
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

    public record PatchList(String minecraftVersion, List<String> patches) {}

    @PreAuthorize("hasRole('PATCH')")
    @PostMapping(
            value = "/start-patches",
            consumes = "application/json",
            produces = "application/json"
    )
    public ResponseEntity<?> startPatch(final Authentication auth, @RequestBody final PatchList input) {
        final String user = this.getUser(auth);
        final List<String> result = this.patchService.startWorkOnPatches(input.minecraftVersion(), input.patches(), user);
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

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleException(final IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
    }
}
