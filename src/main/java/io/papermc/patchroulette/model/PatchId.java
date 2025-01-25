package io.papermc.patchroulette.model;

import java.io.Serializable;
import java.util.Objects;

public class PatchId implements Serializable {
    private String minecraftVersion;
    private String path;

    public PatchId() {
    }

    public PatchId(final String minecraftVersion, final String path) {
        this.minecraftVersion = minecraftVersion;
        this.path = path;
    }

    @Override
    public boolean equals(final Object o) {
        if (o == null || this.getClass() != o.getClass()) {
            return false;
        }
        final PatchId patch = (PatchId) o;
        return Objects.equals(this.minecraftVersion, patch.minecraftVersion) && Objects.equals(this.path, patch.path);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.minecraftVersion, this.path);
    }
}
