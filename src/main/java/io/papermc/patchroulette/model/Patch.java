package io.papermc.patchroulette.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import java.time.Duration;
import java.time.Instant;
import org.jspecify.annotations.Nullable;

@Entity
@IdClass(PatchId.class)
public class Patch {

  @Id
  private String minecraftVersion;

  @Id
  @Column(columnDefinition = "VARCHAR(1024)")
  private String path;

  @Enumerated(EnumType.ORDINAL)
  private Status status;

  @Nullable
  private String responsibleUser;

  @Nullable
  private Instant lastUpdated;

  @Nullable
  private Duration duration;

  public Patch() {}

  public String getMinecraftVersion() {
    return this.minecraftVersion;
  }

  public void setMinecraftVersion(final String minecraftVersion) {
    this.minecraftVersion = minecraftVersion;
  }

  public String getPath() {
    return this.path;
  }

  public void setPath(final String path) {
    this.path = path;
  }

  public Status getStatus() {
    return this.status;
  }

  public void setStatus(final Status status) {
    this.status = status;
  }

  public @Nullable String getResponsibleUser() {
    return this.responsibleUser;
  }

  public void setResponsibleUser(final @Nullable String responsibleUser) {
    this.responsibleUser = responsibleUser;
  }

  public @Nullable Instant getLastUpdated() {
    return lastUpdated;
  }

  public void setLastUpdated(final @Nullable Instant lastUpdated) {
    this.lastUpdated = lastUpdated;
  }

  public @Nullable Duration getDuration() {
    return duration;
  }

  public void setDuration(final @Nullable Duration duration) {
    this.duration = duration;
  }

  public void updateDuration() {
    if (this.lastUpdated != null) {
      final Duration elapsed = Duration.between(this.lastUpdated, Instant.now());
      if (this.duration == null) {
        this.duration = elapsed;
      } else {
        this.duration = this.duration.plus(elapsed);
      }
    }
  }
}
