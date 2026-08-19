<aside class="paper-chan" aria-label="Paper Chan companion">
    <div class="companion-bubble border-kumo-line bg-kumo-layer text-kumo-default">
        <strong>Paper Chan Companion</strong>
        <span>Watching your patch queue. Ganbatte! ✨</span>
    </div>
    <img src="/brainrot/paper-chan.png" alt="Paper Chan" />
</aside>

<style>
    .paper-chan {
        position: fixed;
        z-index: 31;
        right: 1rem;
        bottom: 1rem;
        width: clamp(4.5rem, 11vw, 8rem);
        pointer-events: none;
        animation: companion-float 3.6s ease-in-out infinite;
    }

    .paper-chan img {
        display: block;
        width: 100%;
        height: auto;
        filter: drop-shadow(0 0 0.8rem rgb(236 72 153 / 55%));
    }

    .companion-bubble {
        position: absolute;
        right: 70%;
        bottom: 75%;
        display: grid;
        gap: 0.2rem;
        width: max-content;
        max-width: min(15rem, 55vw);
        padding: 0.6rem 0.7rem;
        border: 1px solid;
        border-radius: 0.75rem;
        box-shadow: 0 0.75rem 1.5rem rgb(0 0 0 / 18%);
        font-size: 0.7rem;
    }

    .companion-bubble::after {
        position: absolute;
        right: 0.75rem;
        bottom: -0.4rem;
        width: 0.75rem;
        height: 0.75rem;
        content: "";
        border-right: 1px solid;
        border-bottom: 1px solid;
        background: inherit;
        transform: rotate(45deg);
    }

    .companion-bubble strong {
        font-size: 0.75rem;
    }

    .companion-bubble span {
        color: var(--color-kumo-subtle, currentColor);
    }

    @keyframes companion-float {
        0%,
        100% {
            transform: translateY(0) rotate(-1deg);
        }
        50% {
            transform: translateY(-0.7rem) rotate(1deg);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .paper-chan {
            animation-play-state: paused;
        }
    }

    @media (max-width: 50rem) {
        .paper-chan {
            right: 0.35rem;
            bottom: 0.35rem;
        }

        .companion-bubble {
            right: 55%;
        }
    }
</style>
