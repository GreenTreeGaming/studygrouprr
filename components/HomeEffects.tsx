"use client";

import { useEffect, useRef } from "react";

type ArrowDirection = "down-left" | "down" | "down-right";

type HomeArrowCalloutProps = {
    label: string;
    direction?: ArrowDirection;
    className?: string;
};

const STORY_PATH = `
  M 1080 80
  C 920 180, 980 340, 760 440
  S 330 520, 280 760
  S 460 1050, 840 1100
  S 1110 1320, 900 1530
  S 410 1630, 340 1900
  S 560 2200, 930 2260
  S 1080 2500, 750 2710
  S 290 2860, 250 3150
  S 540 3430, 980 3520
`;

const arrowPaths: Record<
    ArrowDirection,
    {
        viewBox: string;
        line: string;
        head: string;
    }
> = {
    "down-left": {
        viewBox: "0 0 82 62",
        line: "M76 8C56 8 42 16 34 29C29 37 25 45 20 53",
        head: "M18 43L20 54L31 50",
    },

    down: {
        viewBox: "0 0 42 64",
        line: "M21 6C21 19 21 34 21 52",
        head: "M13 43L21 53L29 43",
    },

    "down-right": {
        viewBox: "0 0 82 62",
        line: "M6 8C26 8 40 16 48 29C53 37 57 45 62 53",
        head: "M51 50L62 54L64 43",
    },
};

export function HomeArrowCallout({
                                     label,
                                     direction = "down",
                                     className = "",
                                 }: HomeArrowCalloutProps) {
    const arrow = arrowPaths[direction];

    return (
        <div
            className={[
                "hfx-callout",
                `hfx-callout--${direction}`,
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            aria-hidden="true"
        >
            <div className="hfx-callout-motion">
                <span>{label}</span>

                <svg
                    viewBox={arrow.viewBox}
                    role="presentation"
                    focusable="false"
                >
                    <path
                        d={arrow.line}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                    />

                    <path
                        d={arrow.head}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        </div>
    );
}

export function HomeEffects() {
    const progressPathRef = useRef<SVGPathElement>(null);
    const glowPathRef = useRef<SVGPathElement>(null);
    const progressDotRef = useRef<SVGCircleElement>(null);

    const violetOrbRef = useRef<HTMLDivElement>(null);
    const greenOrbRef = useRef<HTMLDivElement>(null);
    const skyOrbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const progressPath = progressPathRef.current;
        const glowPath = glowPathRef.current;
        const progressDot = progressDotRef.current;

        if (!progressPath || !glowPath || !progressDot) {
            return;
        }

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        const pathLength = progressPath.getTotalLength();

        progressPath.style.strokeDasharray = `${pathLength}`;
        progressPath.style.strokeDashoffset = `${pathLength}`;

        glowPath.style.strokeDasharray = `${pathLength}`;
        glowPath.style.strokeDashoffset = `${pathLength}`;

        let animationFrame = 0;

        function updateEffects() {
            animationFrame = 0;

            const documentElement = document.documentElement;

            const scrollableHeight =
                documentElement.scrollHeight - window.innerHeight;

            const progress =
                scrollableHeight > 0
                    ? Math.min(
                        1,
                        Math.max(0, window.scrollY / scrollableHeight)
                    )
                    : 0;

            const dashOffset = pathLength * (1 - progress);

            progressPath.style.strokeDashoffset = `${dashOffset}`;
            glowPath.style.strokeDashoffset = `${dashOffset}`;

            const pathPoint = progressPath.getPointAtLength(
                pathLength * progress
            );

            progressDot.setAttribute("cx", `${pathPoint.x}`);
            progressDot.setAttribute("cy", `${pathPoint.y}`);

            progressDot.style.opacity = progress > 0.008 ? "1" : "0";

            if (violetOrbRef.current) {
                violetOrbRef.current.style.transform = `translate3d(
          0,
          ${progress * 110}px,
          0
        )`;
            }

            if (greenOrbRef.current) {
                greenOrbRef.current.style.transform = `translate3d(
          0,
          ${progress * -75}px,
          0
        )`;
            }

            if (skyOrbRef.current) {
                skyOrbRef.current.style.transform = `translate3d(
          0,
          ${progress * 55}px,
          0
        )`;
            }
        }

        function requestUpdate() {
            if (animationFrame) {
                return;
            }

            animationFrame = window.requestAnimationFrame(updateEffects);
        }

        if (reducedMotion.matches) {
            progressPath.style.strokeDashoffset = "0";
            glowPath.style.strokeDashoffset = "0";
            progressDot.style.display = "none";
        } else {
            updateEffects();

            window.addEventListener("scroll", requestUpdate, {
                passive: true,
            });

            window.addEventListener("resize", requestUpdate);
        }

        const revealElements =
            document.querySelectorAll<HTMLElement>(".home-reveal");

        if (reducedMotion.matches) {
            revealElements.forEach((element) => {
                element.classList.add("home-reveal--visible");
            });
        } else {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) {
                            return;
                        }

                        entry.target.classList.add(
                            "home-reveal--visible"
                        );

                        observer.unobserve(entry.target);
                    });
                },
                {
                    threshold: 0.14,
                    rootMargin: "0px 0px -8% 0px",
                }
            );

            revealElements.forEach((element) => {
                observer.observe(element);
            });

            return () => {
                if (animationFrame) {
                    window.cancelAnimationFrame(animationFrame);
                }

                window.removeEventListener("scroll", requestUpdate);
                window.removeEventListener("resize", requestUpdate);

                observer.disconnect();
            };
        }

        return () => {
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
            }

            window.removeEventListener("scroll", requestUpdate);
            window.removeEventListener("resize", requestUpdate);
        };
    }, []);

    return (
        <>
            <style>{effectsStyles}</style>

            <div className="hfx-storyline" aria-hidden="true">
                <div
                    ref={violetOrbRef}
                    className="hfx-orb hfx-orb--violet"
                />

                <div
                    ref={greenOrbRef}
                    className="hfx-orb hfx-orb--green"
                />

                <div
                    ref={skyOrbRef}
                    className="hfx-orb hfx-orb--sky"
                />

                <svg
                    viewBox="0 0 1200 3600"
                    preserveAspectRatio="none"
                    role="presentation"
                    focusable="false"
                >
                    <defs>
                        <linearGradient
                            id="home-story-gradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="38%" stopColor="#8b5cf6" />
                            <stop offset="70%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>

                        <filter id="home-story-glow">
                            <feGaussianBlur stdDeviation="7" />
                        </filter>
                    </defs>

                    <path
                        d={STORY_PATH}
                        className="hfx-path-base"
                        vectorEffect="non-scaling-stroke"
                    />

                    <path
                        ref={glowPathRef}
                        d={STORY_PATH}
                        className="hfx-path-glow"
                        filter="url(#home-story-glow)"
                        vectorEffect="non-scaling-stroke"
                    />

                    <path
                        ref={progressPathRef}
                        d={STORY_PATH}
                        className="hfx-path-progress"
                        vectorEffect="non-scaling-stroke"
                    />

                    <circle
                        ref={progressDotRef}
                        r="7"
                        className="hfx-path-dot"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>
        </>
    );
}

const effectsStyles = `
  .hfx-storyline {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .hfx-storyline svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .hfx-path-base {
    fill: none;
    stroke: rgba(124, 58, 237, 0.095);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 5 13;
  }

  .hfx-path-glow {
    fill: none;
    stroke: url("#home-story-gradient");
    stroke-width: 13;
    stroke-linecap: round;
    opacity: 0.15;
  }

  .hfx-path-progress {
    fill: none;
    stroke: url("#home-story-gradient");
    stroke-width: 2.8;
    stroke-linecap: round;
  }

  .hfx-path-dot {
    fill: #ffffff;
    stroke: #7c3aed;
    stroke-width: 3;
    opacity: 0;
    filter: drop-shadow(
      0 4px 9px rgba(124, 58, 237, 0.3)
    );
  }

  .hfx-orb {
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
    will-change: transform;
    filter: blur(4px);
  }

  .hfx-orb--violet {
    top: 14%;
    right: -180px;
    width: 390px;
    height: 390px;
    background: rgba(124, 58, 237, 0.045);
  }

  .hfx-orb--green {
    top: 49%;
    left: -190px;
    width: 420px;
    height: 420px;
    background: rgba(16, 185, 129, 0.04);
  }

  .hfx-orb--sky {
    right: -140px;
    bottom: 7%;
    width: 340px;
    height: 340px;
    background: rgba(56, 189, 248, 0.045);
  }

  /*
   * Viewport reveals
   */
  .home-reveal {
    opacity: 0;
    transform: translateY(28px) scale(0.988);
    transition:
      opacity 720ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 720ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .home-reveal[data-reveal="left"] {
    transform: translateX(-30px);
  }

  .home-reveal[data-reveal="right"] {
    transform: translateX(30px);
  }

  .home-reveal--visible {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }

  .hp-steps .home-reveal:nth-child(2) {
    transition-delay: 90ms;
  }

  .hp-steps .home-reveal:nth-child(3) {
    transition-delay: 180ms;
  }

  /*
   * Arrow callouts
   */
  .hfx-callout {
    z-index: 4;
    color: #7c3aed;
    pointer-events: none;
  }

  .hfx-callout-motion {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    animation: hfx-callout-float 2.8s ease-in-out infinite;
  }

  .hfx-callout span {
    display: inline-flex;
    min-height: 25px;
    align-items: center;
    justify-content: center;
    padding: 5px 10px;
    border: 1px solid rgba(196, 181, 253, 0.62);
    border-radius: 999px;
    background: rgba(245, 243, 255, 0.96);
    color: #7c3aed;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.025em;
    line-height: 1;
    white-space: nowrap;
    box-shadow:
      0 7px 18px rgba(124, 58, 237, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.85);
  }

  .hfx-callout svg {
    width: 66px;
    height: 52px;
    overflow: visible;
    filter: drop-shadow(
      0 2px 3px rgba(124, 58, 237, 0.1)
    );
  }

  .hfx-callout path {
    stroke-dasharray: 130;
    animation: hfx-arrow-draw 3.3s ease-in-out infinite;
  }

  .hfx-callout--down .hfx-callout-motion {
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .hfx-callout--down svg {
    width: 36px;
    height: 54px;
  }

  .hfx-callout--down-left .hfx-callout-motion {
    flex-direction: row-reverse;
  }

  @keyframes hfx-callout-float {
    0%,
    100% {
      transform: translateY(0) rotate(-1deg);
    }

    50% {
      transform: translateY(-7px) rotate(1deg);
    }
  }

  @keyframes hfx-arrow-draw {
    0% {
      stroke-dashoffset: 130;
      opacity: 0.25;
    }

    22% {
      stroke-dashoffset: 0;
      opacity: 1;
    }

    76% {
      stroke-dashoffset: 0;
      opacity: 1;
    }

    100% {
      stroke-dashoffset: -18;
      opacity: 0.2;
    }
  }

  @media (max-width: 760px) {
    .hfx-path-base {
      opacity: 0.5;
    }

    .hfx-path-progress {
      stroke-width: 2.2;
      opacity: 0.72;
    }

    .hfx-path-glow {
      opacity: 0.08;
    }

    .hfx-callout span {
      font-size: 8px;
      padding: 4px 8px;
    }

    .hfx-callout svg {
      width: 53px;
      height: 45px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-reveal {
      opacity: 1;
      transform: none;
      transition: none;
    }

    .hfx-callout-motion,
    .hfx-callout path {
      animation: none;
    }

    .hfx-orb {
      transform: none !important;
    }
  }
`;