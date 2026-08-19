<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        seed?: number;
        speed?: number;
        zIndex?: number;
        ariaHidden?: boolean;
    }

    let { children, seed = 1, speed = 1, zIndex = 20, ariaHidden = false }: Props = $props();

    function seededRandom(initialSeed: number): () => number {
        let state = initialSeed >>> 0;

        return () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }

    function dvdBounce(initialSeed: number, speedMultiplier: number) {
        return (bouncer: HTMLDivElement) => {
            const random = seededRandom(initialSeed);
            const viewportSize = () => ({
                width: window.visualViewport?.width ?? window.innerWidth,
                height: window.visualViewport?.height ?? window.innerHeight,
            });
            const maxPosition = () => {
                const viewport = viewportSize();
                return {
                    x: Math.max(0, viewport.width - bouncer.offsetWidth),
                    y: Math.max(0, viewport.height - bouncer.offsetHeight),
                };
            };
            const position = maxPosition();
            const state = {
                x: random() * position.x,
                y: random() * position.y,
                vx: (random() > 0.5 ? 1 : -1) * (0.85 + random() * 0.85) * speedMultiplier,
                vy: (random() > 0.5 ? 1 : -1) * (0.85 + random() * 0.85) * speedMultiplier,
            };

            const render = () => {
                bouncer.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
            };
            const clamp = () => {
                const position = maxPosition();
                state.x = Math.max(0, Math.min(state.x, position.x));
                state.y = Math.max(0, Math.min(state.y, position.y));
                render();
            };

            const resizeObserver = new ResizeObserver(clamp);
            resizeObserver.observe(bouncer);
            window.addEventListener("resize", clamp, { passive: true });
            window.visualViewport?.addEventListener("resize", clamp, { passive: true });

            render();
            let frame = 0;
            let previous = performance.now();
            const tick = (now: number) => {
                const delta = Math.min((now - previous) / 16.67, 2);
                previous = now;
                const position = maxPosition();

                state.x += state.vx * delta;
                state.y += state.vy * delta;

                if (position.x > 0 && (state.x <= 0 || state.x >= position.x)) {
                    state.x = Math.max(0, Math.min(state.x, position.x));
                    state.vx *= -1;
                }
                if (position.y > 0 && (state.y <= 0 || state.y >= position.y)) {
                    state.y = Math.max(0, Math.min(state.y, position.y));
                    state.vy *= -1;
                }

                render();
                frame = requestAnimationFrame(tick);
            };

            if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                frame = requestAnimationFrame(tick);
            }

            return () => {
                cancelAnimationFrame(frame);
                resizeObserver.disconnect();
                window.removeEventListener("resize", clamp);
                window.visualViewport?.removeEventListener("resize", clamp);
            };
        };
    }
</script>

<div class="viewport-bouncer" style:z-index={zIndex} aria-hidden={ariaHidden}>
    <div class="bouncer" {@attach dvdBounce(seed, speed)}>
        {@render children()}
    </div>
</div>

<style>
    .viewport-bouncer {
        position: fixed;
        z-index: 20;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
    }

    .bouncer {
        position: absolute;
        top: 0;
        left: 0;
        width: max-content;
        pointer-events: none;
        will-change: transform;
    }
</style>
