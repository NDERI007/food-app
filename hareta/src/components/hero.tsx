// HeroStickyHeadline.tsx
import { useEffect, useRef, useState } from "react";

// Helper functions remain the same
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function HeroStickyHeadline() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

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

  // 4. Text Color Change: Changes to white when the background is dark enough.
  const integrateAt = 0.2; // Tweak this value (0 to 1) to time the color change
  const headlineIsWhite = progress >= integrateAt;
  const headlineColor = headlineIsWhite ? "#fff" : "#1a3a2a";
  const headlineShadow = headlineIsWhite
    ? "0 10px 35px rgba(0,0,0,0.5)"
    : "none";

  return (
    // This parent container's height (300vh) determines the scroll duration of the animation.
    <section ref={heroRef} className="relative h-[300vh] bg-[#faf7ef]">
      {/* This is the sticky "stage" where all animations happen. */}
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Headline Container */}
        <div
          style={{
            transform: `translateY(${textTranslateY}vh)`,
            color: headlineColor,
            textShadow: headlineShadow,
            transition: "color 0.3s ease-in-out",
          }}
          className="relative z-10 mx-auto text-center"
        >
          <h1 className="mb-4 text-4xl font-serif leading-tight md:text-6xl lg:text-7xl">
            The Easy meals for busy days
          </h1>
          <a
            href="#"
            className="inline-block rounded-full bg-amber-400 px-8 py-3 font-semibold text-black shadow-md transition hover:bg-amber-500"
          >
            Get Started
          </a>
        </div>

        {/* Absolutely positioned Image Container */}
        <div
          style={{
            position: "absolute",
            // Center it horizontally
            left: "50%",
            top: "50%", // Center it vertically
            // Use a single transform for all properties for better performance
            transform: `translate(-50%, -50%) translateY(${imgContainerTranslateY}vh)`,
            width: `${imgContainerWidth}%`,
            height: `${imgContainerHeight}vh`,
            borderRadius: `${imgContainerRadius}px`,
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            willChange: "transform, width, height, border-radius",
          }}
        >
          <img
            src="/images/hero-1200.avif" // CHANGE THIS PATH
            alt="Bowls of healthy breakfast"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${innerImgScale})`,
              willChange: "transform",
            }}
          />
        </div>
      </div>
    </section>
  );
}
