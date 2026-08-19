<div class="paper-logo" aria-hidden="true">
    <img src="https://assets.papermc.io/brand/papermc_logo.256.png" alt="" />
</div>

<style>
    .paper-logo {
        width: 6rem;
        isolation: isolate;
    }

    .paper-logo::before {
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

    .paper-logo img {
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
        .paper-logo::before {
            animation-play-state: paused;
        }
    }

    @media (max-width: 26rem) {
        .paper-logo {
            width: 4.5rem;
        }
    }
</style>
