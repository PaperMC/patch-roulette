<script lang="ts">
    import ViewportDvdBouncer from "./ViewportDvdBouncer.svelte";

    const videos = [
        {
            title: "Subway Surfers gameplay",
            type: "youtube",
            src: "https://www.youtube-nocookie.com/embed/i0M4ARe9v0Y?autoplay=1&mute=1&controls=1&loop=1&playlist=i0M4ARe9v0Y&playsinline=1&rel=0&enablejsapi=1",
        },
        {
            title: "CS2 Surf Utopia gameplay",
            type: "youtube",
            src: "https://www.youtube-nocookie.com/embed/4fwSVo_bOo8?autoplay=1&mute=1&controls=1&loop=1&playlist=4fwSVo_bOo8&playsinline=1&rel=0&enablejsapi=1",
        },
        {
            title: "Forgetting to rebase on master",
            type: "local",
            src: "/brainrot/papermc-rebase.mp4",
        },
    ] as const;

    function toggleYoutubeAudio(event: MouseEvent): void {
        const button = event.currentTarget;
        if (!(button instanceof HTMLButtonElement)) return;

        const iframe = button.parentElement?.querySelector("iframe");
        if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) return;

        const sendCommand = (func: string) => {
            iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "https://www.youtube-nocookie.com");
        };

        const enabled = button.dataset.audioEnabled === "true";
        if (enabled) {
            sendCommand("mute");
        } else {
            sendCommand("unMute");
            sendCommand("playVideo");
        }
        button.dataset.audioEnabled = String(!enabled);
        button.style.color = enabled ? "" : "var(--color-kumo-success, #4ade80)";
        button.setAttribute("aria-label", `${enabled ? "Enable" : "Mute"} sound`);
    }
</script>

<section aria-label="Brainrot videos">
    {#each videos as video, index (video.title)}
        <ViewportDvdBouncer seed={17 + index * 36}>
            <div class="floating-video border-kumo-line bg-kumo-layer">
                {#if video.type === "local"}
                    <video src={video.src} autoplay muted loop playsinline controls aria-label={video.title}></video>
                {:else}
                    <div class="youtube-frame">
                        <iframe src={video.src} title={video.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>
                        <button class="audio-surface" type="button" onclick={toggleYoutubeAudio} aria-label={`Enable sound for ${video.title}`}></button>
                    </div>
                {/if}
            </div>
        </ViewportDvdBouncer>
    {/each}
</section>

<style>
    .floating-video {
        --video-width: min(36vw, 32rem);
        width: var(--video-width);
        overflow: hidden;
        border-radius: 0.75rem;
        box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 28%);
        pointer-events: auto;
        will-change: transform;
    }

    .floating-video iframe,
    .floating-video video {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        border: 0;
    }

    .youtube-frame {
        position: relative;
    }

    .audio-surface {
        position: absolute;
        z-index: 1;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: transparent;
        cursor: pointer;
    }

    .audio-surface:focus-visible {
        outline: 3px solid #67e8f9;
        outline-offset: -0.35rem;
    }

    @media (min-width: 50.01rem) {
        .audio-surface {
            display: none;
        }
    }

    @media (max-width: 50rem) {
        .floating-video {
            --video-width: min(72vw, 22rem);
        }
    }
</style>
