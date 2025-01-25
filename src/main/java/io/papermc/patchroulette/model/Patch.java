package io.papermc.patchroulette.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.ManyToOne;

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

    @ManyToOne
    private PatchRouletteUser responsibleUser;

    public Patch() {
    }

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

    public PatchRouletteUser getResponsibleUser() {
        return this.responsibleUser;
    }

    public void setResponsibleUser(final PatchRouletteUser responsibleUser) {
        this.responsibleUser = responsibleUser;
    }
}
