package io.papermc.patchroulette.repository;

import io.papermc.patchroulette.model.PatchId;
import io.papermc.patchroulette.model.StateType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "patch")
@IdClass(PatchId.class)
public class PatchEntity {

  @Id
  private String minecraftVersion;

  @Id
  @Column(columnDefinition = "VARCHAR(1024)")
  private String path;

  @Enumerated(EnumType.STRING)
  @Column(name = "state_type", nullable = false, length = 16)
  private StateType stateType;

  @Nullable
  @Column(name = "responsible_user")
  private String responsibleUser;

  @Nullable
  @Column(name = "started_at")
  private Instant startedAt;

  @Nullable
  @Column(name = "duration")
  private Duration duration;

  @Nullable
  @Column(name = "last_updated")
  private Instant lastUpdated;

  public PatchEntity() {}

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

  public StateType getStateType() {
    return this.stateType;
  }

  public void setStateType(final StateType stateType) {
    this.stateType = stateType;
  }

  public @Nullable String getResponsibleUser() {
    return this.responsibleUser;
  }

  public void setResponsibleUser(final @Nullable String responsibleUser) {
    this.responsibleUser = responsibleUser;
  }

  public @Nullable Instant getStartedAt() {
    return this.startedAt;
  }

  public void setStartedAt(final @Nullable Instant startedAt) {
    this.startedAt = startedAt;
  }

  public @Nullable Duration getDuration() {
    return this.duration;
  }

  public void setDuration(final @Nullable Duration duration) {
    this.duration = duration;
  }

  public @Nullable Instant getLastUpdated() {
    return this.lastUpdated;
  }

  public void setLastUpdated(final @Nullable Instant lastUpdated) {
    this.lastUpdated = lastUpdated;
  }
}
