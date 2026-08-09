<script lang="ts">
    const sourceVideos = [
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

    function seededRandom(seed: number): () => number {
        let state = seed;
        const next = () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
        };
        return next;
    }

    const videos = sourceVideos;
    let layer: HTMLElement;
    let videoNodes = $state<HTMLDivElement[]>([]);

    function enableYoutubeAudio(event: MouseEvent): void {
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

    $effect(() => {
        if (!layer || videoNodes.length !== videos.length) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const states = videos.map((_, index) => {
            const random = seededRandom(17 + index * 36);
            const bounds = layer.getBoundingClientRect();
            const node = videoNodes[index];
            const maxX = Math.max(0, bounds.width - node.offsetWidth);
            const maxY = Math.max(0, bounds.height - node.offsetHeight);
            const speed = 1.1 + random() * 1.2;
            return {
                x: random() * maxX,
                y: random() * maxY,
                vx: (random() > 0.5 ? 1 : -1) * speed,
                vy: (random() > 0.5 ? 1 : -1) * speed,
            };
        });

        const render = () => {
            states.forEach((state, index) => {
                videoNodes[index].style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
            });
        };

        render();
        if (reducedMotion) return;

        let frame = 0;
        let previous = performance.now();
        const tick = (now: number) => {
            const delta = Math.min((now - previous) / 16.67, 2);
            previous = now;
            const bounds = layer.getBoundingClientRect();

            states.forEach((state, index) => {
                const node = videoNodes[index];
                const maxX = Math.max(0, bounds.width - node.offsetWidth);
                const maxY = Math.max(0, bounds.height - node.offsetHeight);
                state.x += state.vx * delta;
                state.y += state.vy * delta;

                if (state.x <= 0 || state.x >= maxX) {
                    state.x = Math.max(0, Math.min(state.x, maxX));
                    state.vx *= -1;
                }
                if (state.y <= 0 || state.y >= maxY) {
                    state.y = Math.max(0, Math.min(state.y, maxY));
                    state.vy *= -1;
                }
            });

            render();
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    });
</script>

<section class="brainrot-layer" bind:this={layer} aria-label="Brainrot videos">
    {#each videos as video, index (video.title)}
        <div class="floating-video border-kumo-line bg-kumo-layer" bind:this={videoNodes[index]}>
            {#if video.type === "local"}
                <video src={video.src} autoplay muted loop playsinline controls aria-label={video.title}></video>
            {:else}
                <div class="youtube-frame">
                    <iframe src={video.src} title={video.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>
                    <button class="audio-surface" type="button" onclick={enableYoutubeAudio} aria-label={`Enable sound for ${video.title}`}></button>
                </div>
            {/if}
        </div>
    {/each}
</section>

<style>
    .brainrot-layer {
        position: fixed;
        z-index: 20;
        inset: 3rem 0 0;
        pointer-events: none;
    }

    .floating-video {
        --video-width: min(36vw, 32rem);
        position: absolute;
        width: var(--video-width);
        overflow: hidden;
        border-radius: 0.75rem;
        box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 28%);
        pointer-events: auto;
        will-change: top, left, transform;
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
        .brainrot-layer {
            position: fixed;
            inset: 3rem 0 0;
            display: block;
            margin: 0;
            padding: 0;
        }

        .floating-video {
            --video-width: min(72vw, 22rem);
            position: absolute;
        }
    }
</style>
