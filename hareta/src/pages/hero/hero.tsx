// HeroStickyHeadline.tsx
import { useEffect, useRef, useState } from "react";

// Helper functions remain the same
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// --- COLOR HELPERS ---
const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");

const lerpColor = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    Math.round(lerp(r1, r2, t)),
    Math.round(lerp(g1, g2, t)),
    Math.round(lerp(b1, b2, t))
  );
};

export default function HeroStickyHeadline() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  const imgDarkness = lerp(0, 0.4, progress);

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const vh = window.innerHeight;

      // Calculate scroll progress from 0 to 1 based on how much of the
      // 300vh container has been scrolled through.
      const scrollProgress = -rect.top / (rect.height - vh);

      setProgress(clamp(scrollProgress));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // --- ANIMATION VALUES ---

  // 1. Text Animation: Moves down from the top-center of the screen
  // It starts 15vh above the center and moves down to the center.
  const textTranslateY = lerp(-15, 0, progress);

  // 2. Image Container Animation: Moves up, expands, and becomes square.
  // The container starts 20vh below the center and moves up to the center.
  const imgContainerTranslateY = lerp(40, 0, progress);
  // It starts narrower and expands to full width.
  const imgContainerWidth = lerp(75, 100, progress); // in %
  // It starts shorter and expands to full height.
  const imgContainerHeight = lerp(60, 100, progress); // in vh
  // It starts rounded and becomes a sharp rectangle.
  const imgContainerRadius = lerp(32, 0, progress);

  // 3. Inner Image Animation: A subtle zoom effect for parallax (Ken Burns)
  const innerImgScale = lerp(1.2, 1, progress);

  // --- STEPWISE COLOR TRANSITION ---
  const baseColor = "#195908"; // dark green
  const midColor = "#3f704d"; // light green
  const endColor = "#faf7ef"; // cream

  let headlineColor = baseColor;

  if (progress < 0.2) {
    headlineColor = baseColor;
  } else if (progress >= 0.2 && progress < 0.3) {
    const t = (progress - 0.2) / 0.1;
    headlineColor = lerpColor(baseColor, midColor, t);
  } else if (progress >= 0.3 && progress < 0.4) {
    const t = (progress - 0.3) / 0.1;
    headlineColor = lerpColor(midColor, endColor, t);
  } else {
    headlineColor = endColor;
  }

  return (
    // This parent container's height (300vh) determines the scroll duration of the animation.
    <section ref={heroRef} className="relative h-[300vh] bg-[]">
      {/* This is the sticky "stage" where all animations happen. */}
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Headline Container */}
        <div
          style={{
            transform: `translateY(${textTranslateY}vh)`,
          }}
          className="relative z-10 mx-auto text-center"
        >
          {/* Gradient headline */}
          <h1
            className="mb-4 text-4xl leading-tight md:text-6xl lg:text-7xl"
            style={{
              color: headlineColor,
            }}
          >
            The Easy meals for busy days
          </h1>

          <a
            href="#"
            className="inline-block rounded-full bg-amber-400 px-8 py-3 font-semibold text-black shadow-md transition hover:bg-amber-500"
          >
            Get Started
          </a>
        </div>

        {/*  Image Container */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translateY(${imgContainerTranslateY}vh)`,
            width: `${imgContainerWidth}%`,
            height: `${imgContainerHeight}vh`,
            borderRadius: `${imgContainerRadius}px`,
            overflow: "hidden",
            willChange: "transform, width, height, border-radius",
          }}
        >
          <img
            src="/images/hero-1200.avif"
            alt="Choma"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${innerImgScale})`,
              willChange: "transform",
            }}
          />

          {/* Darkening overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `rgba(0,0,0,${imgDarkness})`,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </section>
  );
}
