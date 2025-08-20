"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  // replaced percent state with intensity state (0..1)
  const [upIntensity, setUpIntensity] = useState(0);
  const [downIntensity, setDownIntensity] = useState(0);
  const prevY = useRef<number>(0);
  const targetUp = useRef<number>(0);
  const targetDown = useRef<number>(0);
  // track last scroll direction: 1 = down, -1 = up, 0 = none
  const lastDir = useRef<number>(0);
  // idle timer: when no scroll for 500ms, hide the scroll images
  const idleTimer = useRef<number | null>(null);
  // show arrows only while user is actively scrolling (cleared after idle)
  const [showArrows, setShowArrows] = useState(false);

  // add: theme state + helper
  const [theme, setThemeState] = useState<"pc" | "dark" | "clear">("pc");
  // compute background class for the selector based on current theme (pc -> use system preference)
  const selectorBg = (() => {
    if (theme === "clear") return "bg-black/[.16]";
    if (theme === "dark") return "bg-white/[.16]";
    // pc: reflect system preference
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "bg-white/[.16]" : "bg-black/[.16]";
    }
    return "bg-white/[.16]";
  })();

  // applyTheme: handle 'pc' by applying current system scheme (dark/clear)
  const applyTheme = (t: "pc" | "dark" | "clear") => {
    const el = document.documentElement;
    // clear any explicit theme classes
    el.classList.remove("theme-dark", "theme-clear");

    if (t === "dark") {
      el.classList.add("theme-dark");
    } else if (t === "clear") {
      el.classList.add("theme-clear");
    } else {
      // pc: apply current system preference immediately (dark -> theme-dark, otherwise -> theme-clear)
      if (typeof window !== "undefined" && window.matchMedia) {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        el.classList.add(prefersDark ? "theme-dark" : "theme-clear");
      }
    }

    setThemeState(t);
    try {
      localStorage.setItem("site-theme", t);
    } catch (e) {
      /* ignore */
    }
  };

  // initialize theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("site-theme") as "pc" | "dark" | "clear" | null;
      if (saved === "dark" || saved === "clear" || saved === "pc") {
        applyTheme(saved);
      } else {
        applyTheme("pc");
      }
    } catch (e) {
      applyTheme("pc");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // watch system preference changes only while in 'pc' mode
  useEffect(() => {
    if (theme !== "pc" || typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const el = document.documentElement;
      el.classList.remove("theme-dark", "theme-clear");
      el.classList.add(e.matches ? "theme-dark" : "theme-clear");
    };

    // apply current immediately
    handler(mq);
    // add listener (use addEventListener if available)
    if (typeof mq.addEventListener === "function") {
      // modern browsers
      mq.addEventListener("change", handler as EventListener);
      return () => mq.removeEventListener("change", handler as EventListener);
    } else if (typeof mq.addListener === "function") {
      // older browsers
      mq.addListener(handler as (e: MediaQueryListEvent) => void);
      return () => mq.removeListener(handler as (e: MediaQueryListEvent) => void);
    }
  }, [theme]);

  useEffect(() => {
    let raf = 0;

    // scroll handler: compute direction & velocity, set targets
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - prevY.current;
      // mark that user is scrolling so arrows can appear
      setShowArrows(true);
      if (delta < 0) {
        // scrolling up: show the "up" behavior by driving the DOWN overlay target (inverted)
        const vel = Math.min(-delta, 200);
        targetDown.current = Math.min(1, vel / 40);
        targetUp.current = 0;
        lastDir.current = -1;
      } else if (delta > 0) {
        // scrolling down: show the "down" behavior by driving the UP overlay target (inverted)
        const vel = Math.min(delta, 200);
        targetUp.current = Math.min(1, vel / 40);
        targetDown.current = 0;
        lastDir.current = 1;
      }
      prevY.current = y;

      // reset idle timer — after 500ms of no scroll, hide overlays
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
      idleTimer.current = window.setTimeout(() => {
        targetUp.current = 0;
        targetDown.current = 0;
        // hide arrows when idle
        setShowArrows(false);
      }, 500);
    };

    // animation loop: smoothly interpolate intensity toward targets
    const animate = () => {
      setUpIntensity((u) => {
        const next = u + (targetUp.current - u) * 0.18;
        return Math.abs(next - u) < 0.0005 ? targetUp.current : next;
      });
      setDownIntensity((d) => {
        const next = d + (targetDown.current - d) * 0.18;
        return Math.abs(next - d) < 0.0005 ? targetDown.current : next;
      });
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // start animation loop and initialize prevY
    prevY.current = window.scrollY;
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
      cancelAnimationFrame(raf);
    };
  }, []);

  // inject global CSS: hide scrollbars and enable smooth scroll
  useEffect(() => {
    // inject global CSS: hide scrollbars and enable smooth scroll
    const STYLE_ID = "hide-scrollbar-smooth";
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.innerHTML = `
        /* enable smooth scrolling, hide visual scrollbars and prevent horizontal scroll */
        html, body {
          scroll-behavior: smooth;
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
          overflow-x: hidden; /* prevent horizontal scrolling */
        }
        /* WebKit browsers */
        html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }

        /* Theme rules */
        html.theme-dark, html.theme-dark body {
          background-color: #0b0b0b !important;
          color: #e6e6e6 !important;
        }
        html.theme-dark .bg-foreground { background-color: #111 !important; color: #fff !important; }
        html.theme-dark a { color: #e6e6e6 !important; }

        html.theme-clear, html.theme-clear body {
          background-color: #ffffff !important;
          color: #0b0b0b !important;
        }
        html.theme-clear .bg-foreground { background-color: #fff !important; color: #000 !important; }
        html.theme-clear a { color: #0b0b0b !important; }

        /* theme-aware icons */
        .theme-icon { position: relative; display: inline-block; filter: none; transition: filter .15s ease, opacity .15s ease, transform .2s ease; }
        /* make icons bright/white in dark mode */
        html.theme-dark .theme-icon { filter: invert(1) brightness(2) saturate(1); }
        html.theme-clear .theme-icon { filter: none; }

        /* Star Wars hover ON IMAGES (.theme-icon) */
        .theme-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; padding: 6px; }
        /* halo pseudo-element now attached to the image */
        .theme-icon::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%) translateY(8px) scaleY(0.6);
          width: 0;
          height: 6px;
          background: linear-gradient(90deg,#ffd54a,#fff176,#ffd54a);
          opacity: 0;
          filter: blur(8px);
          transition: width .25s ease, opacity .25s ease, transform .25s ease;
          border-radius: 4px;
          pointer-events: none;
        }
        /* hover triggers when pointer is over the image */
        .theme-icon:hover {
          transform: translateY(-5px) rotateX(6deg) scale(1.04);
          filter: drop-shadow(0 6px 14px rgba(255,215,74,0.25));
        }
        .theme-icon:hover::after {
          width: 120%;
          opacity: 1;
          transform: translateX(-50%) translateY(6px) scaleY(0.86);
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById("hide-scrollbar-smooth");
      if (el) el.remove();
    };
  }, []);

  // smooth wheel scrolling for desktop (pointer:fine)
  useEffect(() => {
    if (typeof window === "undefined") return;
    // enable only on devices with fine pointer (desktop mouse)
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

    let rafId = 0;
    let target = window.scrollY;
    let current = window.scrollY;
    let isRunning = false;

    const clamp = (v: number) =>
      Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, v));

    const step = () => {
      current += (target - current) * 0.12;
      window.scrollTo(0, Math.round(current));
      if (Math.abs(target - current) > 0.5) {
        rafId = requestAnimationFrame(step);
      } else {
        isRunning = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      // only vertical scroll smoothing
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault(); // we registered non-passive so this works
      target = clamp(target + e.deltaY);
      if (!isRunning) {
        isRunning = true;
        current = window.scrollY;
        rafId = requestAnimationFrame(step);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 relative overflow-visible w-[1024px] mx-auto">
      {/* moved & toned-down background render.svg: right side and clipped to avoid horizontal scroll */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[50%] flex items-center justify-end pr-12 -z-10 overflow-hidden"
      >
        <Image
          src="/render.svg"
          alt=""
          width={1600}
          height={1600}
          // keep image large but allow wrapper to clip any overflow
          className="opacity-5 select-none max-w-none translate-x-12"
          priority
        />
      </div>

      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
              src/app/page.tsx
            </code>
            .
          </li>
          <li className="tracking-[-.01em]">
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
        <div style={{ height: '10000px' }}></div>
      </main>

      {/* spacer to allow scrolling while testing waves */}
      <div className="h-[150vh] w-full" />

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>

      {/* Fixed theme selector — always visible at top-right */}
      <div className={`fixed right-6 top-6 z-50 flex items-center gap-2 ${selectorBg} backdrop-blur-sm rounded-full p-1`}>
        <button
          onClick={() => applyTheme("clear")}
          className={`px-2 py-1 rounded text-xs`}
          aria-pressed={theme === "clear"}
        >
          <Image
            aria-hidden
            src="/light.svg"
            alt="lightside"
            width={30}
            height={30}
            className="theme-icon"
          />
        </button>
        <button
          onClick={() => applyTheme("pc")}
          className={`px-2 py-1 rounded text-xs`}
          aria-pressed={theme === "pc"}
        >
          <Image
            aria-hidden
            src="/choose.svg"
            alt="Choose"
            width={30}
            height={30}
            className="theme-icon"
          />
        </button>
      <button
          onClick={() => applyTheme("dark")}
          className={`px-2 py-1 rounded text-xs`}
          aria-pressed={theme === "dark"}
        >
          <Image
            aria-hidden
            src="/dark.svg"
            alt="darkside"
            width={30}
            height={30}
            className="theme-icon"
          />
        </button>
      </div>

      {/* Fixed middle-left stack: each "packet" contains arrow + full svg (arrow gets "filled" by full svg) */}
      <div className="fixed left-6 top-1/2 transform -translate-y-1/2 z-30 flex flex-col items-center gap-2">
        {/* UP packet (above mouse): arrow centered, full svg reveals from bottom to "fill" the packet */}
        <div className="relative w-12 sm:w-14 h-12 sm:h-12">
          {/* full image grows from bottom to fill the packet */}
          <div
            className="absolute inset-0 flex items-end justify-center overflow-hidden transition-all duration-200"
            style={{
              height: `${Math.round(upIntensity * 100)}%`,
              opacity: upIntensity,
              pointerEvents: "none",
            }}
          >
            <div className="relative w-full h-full">
              <Image src="/scroll_up.svg" alt="scroll up" fill className="object-contain theme-icon" />
            </div>
          </div>
          {/* arrow sits in the same packet and fades out as packet fills */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
            style={{
              // show only when last scroll direction was UP
              opacity: lastDir.current === -1 && showArrows ? Math.max(0, 1 - upIntensity * 1.6) : 0,
            }}
          >
            <Image src="/one_arrow_scroll_down.svg" alt="one arrow up" width={20} height={20} className="theme-icon" />
          </div>
        </div>

        {/* Mouse */}
        <div className="relative w-12 h-12 sm:w-14 sm:h-14">
          <Image src="/mouse.svg" alt="mouse" fill className="object-contain theme-icon" priority style={{ zIndex: 50 }} />
        </div>

        {/* DOWN packet (below mouse): arrow centered, full svg reveals from top to fill the packet */}
        <div className="relative w-12 sm:w-14 h-12 sm:h-12">
          {/* full image grows from top */}
          <div
            className="absolute inset-0 flex items-start justify-center overflow-hidden transition-all duration-200"
            style={{
              height: `${Math.round(downIntensity * 100)}%`,
              opacity: downIntensity,
              pointerEvents: "none",
            }}
          >
            <div className="relative w-full h-full">
              <Image src="/scroll_down.svg" alt="scroll down" fill className="object-contain theme-icon" />
            </div>
          </div>
          {/* arrow sits in the same packet and fades out as packet fills */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
            style={{
              // show only when last scroll direction was DOWN
              opacity: lastDir.current === 1 && showArrows ? Math.max(0, 1 - downIntensity * 1.6) : 0,
            }}
          >
            <Image src="/one_arrow_scroll_up.svg" alt="one arrow down" width={20} height={20} className="theme-icon" />
          </div>
        </div>
      </div>
    </div>
  );
}


