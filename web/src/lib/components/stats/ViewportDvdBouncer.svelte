<script lang="ts">
    let bouncer: HTMLDivElement;

    $effect(() => {
        if (!bouncer) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const state = { x: 24, y: 72, vx: 2.15, vy: 1.75 };

        const render = () => {
            bouncer.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
        };

        render();
        if (reducedMotion) return;

        let frame = 0;
        let previous = performance.now();
        const tick = (now: number) => {
            const delta = Math.min((now - previous) / 16.67, 2);
            previous = now;
            const maxX = Math.max(0, window.innerWidth - bouncer.offsetWidth);
            const maxY = Math.max(0, window.innerHeight - bouncer.offsetHeight);

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

            render();
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    });
</script>

<div class="viewport-bouncer" bind:this={bouncer} aria-hidden="true">
    <img src="https://assets.papermc.io/brand/papermc_logo.256.png" alt="" />
</div>

<style>
    .viewport-bouncer {
        position: fixed;
        z-index: 30;
        top: 0;
        left: 0;
        width: 6rem;
        height: auto;
        isolation: isolate;
        pointer-events: none;
        will-change: transform;
    }

    .viewport-bouncer::before {
        position: absolute;
        z-index: -1;
        inset: -1.25rem;
        content: "";
        border-radius: 50%;
        background: conic-gradient(#22d3ee, #818cf8, #e879f9, #fb7185, #facc15, #22d3ee);
        filter: blur(1.1rem);
        opacity: 0.82;
        mix-blend-mode: screen;
        animation:
            glow-spin 5s linear infinite,
            glow-pulse 2.4s ease-in-out infinite alternate;
    }

    .viewport-bouncer img {
        display: block;
        width: 100%;
        height: auto;
        filter: drop-shadow(0 0 0.2rem #fff) drop-shadow(0 0 0.8rem #67e8f9) drop-shadow(0 0 1.2rem #e879f9);
    }

    @keyframes glow-spin {
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes glow-pulse {
        to {
            opacity: 0.98;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .viewport-bouncer::before {
            animation-play-state: paused;
        }
    }

    @media (max-width: 26rem) {
        .viewport-bouncer {
            width: 4.5rem;
        }
    }
</style>
