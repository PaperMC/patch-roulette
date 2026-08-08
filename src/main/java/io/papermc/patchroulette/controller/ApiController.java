package io.papermc.patchroulette.controller;

import io.papermc.patchroulette.model.Patch;
import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.PatchState;
import io.papermc.patchroulette.service.PatchService;
import io.papermc.patchroulette.util.TimeUtil;
import jakarta.persistence.EntityNotFoundException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ApiController {

  private final PatchService patchService;

  @Autowired
  public ApiController(final PatchService patchService) {
    this.patchService = patchService;
  }

  @PreAuthorize("hasRole('PATCH')")
  @GetMapping(value = "/get-available-patches", produces = "application/json")
  public ResponseEntity<List<String>> getAvailablePatches(
      @RequestParam final String minecraftVersion) {
    return ResponseEntity.ok(this.patchService.getAvailablePatches(minecraftVersion).stream()
        .map(patch -> patch.id().getPath())
        .toList());
  }

  public record PatchDetails(
      String path,
      String status,
      @Nullable String responsibleUser,
      @Nullable Instant lastUpdated,
      @Nullable Duration duration) {}

  private static PatchDetails toPatchDetails(final Patch patch) {
    final PatchState state = patch.state();
    return switch (state) {
      case PatchState.Available a ->
        new PatchDetails(patch.id().getPath(), state.label(), null, patch.lastUpdated(), null);
      case PatchState.InProgress w ->
        new PatchDetails(
            patch.id().getPath(), state.label(), w.responsibleUser(), patch.lastUpdated(), null);
      case PatchState.Completed c ->
        new PatchDetails(
            patch.id().getPath(),
            state.label(),
            c.responsibleUser(),
            patch.lastUpdated(),
            c.duration());
    };
  }

  @PreAuthorize("hasRole('PATCH')")
  @GetMapping(value = "/get-all-patches", produces = "application/json")
  public ResponseEntity<List<PatchDetails>> getAllPatches(
      @RequestParam final String minecraftVersion) {
    return ResponseEntity.ok(this.patchService.getAllPatches(minecraftVersion).stream()
        .map(ApiController::toPatchDetails)
        .toList());
  }

  public record Patches(String minecraftVersion, List<String> paths) {}

  @PreAuthorize("hasRole('PATCH')")
  @PostMapping(value = "/set-patches", consumes = "application/json", produces = "text/plain")
  public ResponseEntity<String> setPatches(@RequestBody final Patches input) {
    this.patchService.setPatches(input.minecraftVersion(), input.paths());
    return ResponseEntity.ok("Patches set.");
  }

  @PreAuthorize("hasRole('PATCH')")
  @PostMapping(value = "/clear-patches", consumes = "text/plain", produces = "text/plain")
  public ResponseEntity<String> clearPatches(@RequestBody final String minecraftVersion) {
    this.patchService.clearPatches(minecraftVersion);
    return ResponseEntity.ok("Patches cleared.");
  }

  private String getUser(final Authentication authentication) {
    return authentication.getName();
  }

  @PreAuthorize("hasRole('PATCH')")
  @PostMapping(value = "/start-patch", consumes = "application/json", produces = "text/plain")
  public ResponseEntity<String> startPatch(
      final Authentication auth, @RequestBody final PatchId input) {
    final String user = this.getUser(auth);
    final List<String> result = this.patchService.startWorkOnPatches(
        input.getMinecraftVersion(), List.of(input.getPath()), user);
    if (result.isEmpty()) {
      return ResponseEntity.status(HttpStatus.CONFLICT).body("Patch not available.");
    }
    return ResponseEntity.ok("Patch started.");
  }

  @PreAuthorize("hasRole('PATCH')")
  @PostMapping(
      value = "/start-patches",
      consumes = "application/json",
      produces = "application/json")
  public ResponseEntity<?> startPatch(final Authentication auth, @RequestBody final Patches input) {
    final String user = this.getUser(auth);
    final List<String> result =
        this.patchService.startWorkOnPatches(input.minecraftVersion(), input.paths(), user);
    if (result.isEmpty()) {
      return ResponseEntity.status(HttpStatus.CONFLICT).body("None of the patches are available.");
    }
    return ResponseEntity.ok(result);
  }

  @PreAuthorize("hasRole('PATCH')")
  @PostMapping(value = "/complete-patch", consumes = "application/json", produces = "text/plain")
  public ResponseEntity<String> completePatch(
      final Authentication auth, @RequestBody final PatchId input) {
    final String user = this.getUser(auth);
    this.patchService.finishWorkOnPatch(input, user);
    return ResponseEntity.ok("Patch finished.");
  }

  @PreAuthorize("hasRole('PATCH')")
  @PostMapping(value = "/cancel-patch", consumes = "application/json", produces = "text/plain")
  public ResponseEntity<String> cancelPatch(@RequestBody final PatchId input) {
    this.patchService.cancelWorkOnPatch(input);
    return ResponseEntity.ok("Patch cancelled.");
  }

  @PreAuthorize("hasRole('PATCH')")
  @PostMapping(value = "/undo-patch", consumes = "application/json", produces = "text/plain")
  public ResponseEntity<String> undoPatch(
      final Authentication auth, @RequestBody final PatchId input) {
    final String user = this.getUser(auth);
    this.patchService.undoPatch(input, user);
    return ResponseEntity.ok("Patch moved to WIP.");
  }

  @PreAuthorize("hasRole('PATCH')")
  @GetMapping(value = "/get-minecraft-versions", produces = "application/json")
  public ResponseEntity<List<String>> getMinecraftVersions() {
    final List<String> minecraftVersions = this.patchService.getMinecraftVersions();
    return ResponseEntity.ok(minecraftVersions);
  }

  @PreAuthorize("hasRole('PATCH')")
  @PostMapping(value = "/test-login", produces = "text/plain")
  public ResponseEntity<String> testLogin() {
    return ResponseEntity.ok("Your credentials are valid.");
  }

  public record Stats(
      long total, long available, long wip, long done, List<UserStats> users, Duration timeSpent) {}

  public static class UserStats {
    public String user;
    public long wip;
    public long done;
    public Duration timeSpent;
    private final List<TimeUtil.TimeInterval> intervals = new ArrayList<>();

    public UserStats(String user, long wip, long done, Duration timeSpent) {
      this.user = user;
      this.wip = wip;
      this.done = done;
      this.timeSpent = timeSpent;
    }
  }

  @PreAuthorize("hasRole('PATCH')")
  @GetMapping(value = "/stats", produces = "application/json")
  public ResponseEntity<Stats> stats(@RequestParam final String minecraftVersion) {
    final List<Patch> allPatches = this.patchService.getAllPatches(minecraftVersion);
    final long total = allPatches.size();
    long available = 0;
    long wip = 0;
    long done = 0;
    final Map<String, UserStats> users = new HashMap<>();

    for (final Patch patch : allPatches) {
      switch (patch.state()) {
        case PatchState.Available a -> available++;
        case PatchState.InProgress w -> {
          wip++;
          users.computeIfAbsent(
                  w.responsibleUser(), user -> new UserStats(user, 0, 0, Duration.ZERO))
              .wip++;
        }
        case PatchState.Completed c -> {
          done++;
          final UserStats userStats = users.computeIfAbsent(
              c.responsibleUser(), user -> new UserStats(user, 0, 0, Duration.ZERO));
          userStats.done++;
          final Instant lastUpdated = patch.lastUpdated();
          if (lastUpdated != null) {
            userStats.intervals.add(
                new TimeUtil.TimeInterval(lastUpdated.minus(c.duration()), lastUpdated));
          }
        }
      }
    }

    // Calculate accurate time spent for each user by merging overlapping intervals
    Duration totalTimeSpent = Duration.ZERO;
    for (final UserStats userStats : users.values()) {
      final List<TimeUtil.TimeInterval> intervals = userStats.intervals;
      intervals.sort(Comparator.comparing(TimeUtil.TimeInterval::start));
      final Duration userDuration =
          TimeUtil.calculateDuration(TimeUtil.mergeOverlappingIntervals(intervals));
      userStats.timeSpent = userDuration;
      totalTimeSpent = totalTimeSpent.plus(userDuration);
    }

    final List<UserStats> sortedUsers = users.values().stream()
        .sorted((u1, u2) -> Long.compare(u2.done + u2.wip, u1.done + u1.wip))
        .toList();

    return ResponseEntity.ok(new Stats(total, available, wip, done, sortedUsers, totalTimeSpent));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<String> handleException(final IllegalStateException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
  }

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<String> handleException(final EntityNotFoundException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
  }
}
