// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* Inline stand-in for @gsap/react's useGSAP. Mirrors its default
   `revertOnUpdate: false`: one gsap.context lives for the component's
   lifetime, the callback is re-added when dependencies change, and the
   context is reverted only on unmount. A callback may return its own
   cleanup, which runs before the next re-add and on unmount. */
function useGSAP(
  callback: () => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  }
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => {}, el ?? undefined);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const monthOrder = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
} as const;

type Month = keyof typeof monthOrder;

export type JourneyItem = {
  id: string;
  year: string;
  month: Month;
  content: string;
};

export type TimelineProps = {
  title?: string;
  periodLabel?: string;
  textColor?: string;
  mutedTextColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  items?: JourneyItem[];
  /** Reveal animation duration, in seconds. */
  duration?: number;
  /** Fallback reveal duration when `duration` is omitted, in seconds. */
  scrollDuration?: number;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);

  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;

  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

const topJourneyDataDefault: JourneyItem[] = [
  {
    id: "1981-december",
    year: "1981",
    month: "December",
    content: "First Indian Antarctic Expedition departs from Goa aboard MV Polar Circle",
  },
  {
    id: "1983-december",
    year: "1983",
    month: "December",
    content: "Dakshin Gangotri station established as India's first polar base",
  },
  {
    id: "1989-march",
    year: "1989",
    month: "March",
    content: "Maitri research station commissioned in Schirmacher Oasis",
  },
  {
    id: "2012-march",
    year: "2012",
    month: "March",
    content: "Bharati station commissioned in Larsemann Hills, Antarctica",
  },
];

const bottomJourneyDataDefault: JourneyItem[] = [
  {
    id: "2008-july",
    year: "2008",
    month: "July",
    content: "Himadri Arctic research station inaugurated at Ny-Ålesund, Svalbard",
  },
  {
    id: "2016-october",
    year: "2016",
    month: "October",
    content: "Himansh high-altitude station commissioned in Spiti Valley, Himalayas",
  },
  {
    id: "2026-january",
    year: "2026",
    month: "January",
    content: "DHRUV Integrated Knowledge Platform launches for MoES & NCPOR",
  },
];

export default function Timeline({
  title = "Polar Storyline",
  periodLabel = "1981-2026",
  textColor = "var(--snow, #eef5fa)",
  mutedTextColor = "var(--mist, #9fb4c6)",
  activeColor = "var(--glacier, #5bbfe6)",
  backgroundColor = "var(--navy, #0b1d33)",
  imageUrl = "https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=1200&q=80",
  imageAlt = "Polar ice expedition field site",
  items,
  duration,
  scrollDuration = 1.2,
}: TimelineProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const wholeSliderRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);

  const topJourneyData = items ? items.filter((_, i) => i % 2 === 0) : topJourneyDataDefault;
  const bottomJourneyData = items ? items.filter((_, i) => i % 2 !== 0) : bottomJourneyDataDefault;

  const allJourneyItems: JourneyItem[] = [
    ...topJourneyData,
    ...bottomJourneyData,
  ].sort((a, b) => {
    const yearDiff = Number(a.year) - Number(b.year);
    if (yearDiff !== 0) return yearDiff;
    return monthOrder[a.month] - monthOrder[b.month];
  });

  const sectionStyle: CSSProperties = {
    color: textColor,
    backgroundColor,
  };
  const activeStyle: CSSProperties = {
    backgroundColor: activeColor,
  };
  const mutedTextStyle: CSSProperties = {
    color: mutedTextColor,
  };

  useGSAP(() => {
    const section = sectionRef.current;

    if (!section) return;

    const isMobile = window.innerWidth < 600;
    const slidePercent = isMobile ? -57 : -65;
    const lineWidth = isMobile ? "65%" : "98%";
    const lineStart = isMobile ? "top 30%" : "top 25%";
    const slideEnd = isMobile ? "82% 50%" : "92% bottom";
    const lineEnd = isMobile ? "80% 50%" : "92% bottom";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: slideEnd,
        scrub: true,
      },
      defaults: {
        ease: "none",
      },
    });

    tl.fromTo(
      wholeSliderRef.current,
      { xPercent: 0 },
      { xPercent: slidePercent },
    );

    if (reducedMotion) {
      gsap.set(".journey-line", { width: lineWidth });
      return;
    }

    gsap.to(".journey-line", {
      width: lineWidth,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: lineStart,
        end: lineEnd,
        scrub: true,
      },
    });
  }, { dependencies: [reducedMotion], scope: sectionRef });

  useGSAP(() => {
    const section = sectionRef.current;

    if (!section) return;

    const journeyItems = allJourneyItems;

    if (reducedMotion) {
      journeyItems.forEach((item) => {
        gsap.set(`.jl-${item.id}`, { scaleY: 1 });
        gsap.set(`.jd-${item.id}`, { scale: 1 });
        gsap.set(`.title-${item.id}`, { opacity: 1, clearProps: "transform" });
        gsap.set(`.description-${item.id}`, {
          opacity: 1,
          clearProps: "transform",
        });
      });
      return;
    }

    journeyItems.forEach((item) => {
      gsap.set(`.jl-${item.id}`, {
        scaleY: 0,
        transformOrigin: "bottom bottom",
      });
      gsap.set(`.jd-${item.id}`, { scale: 0 });
      gsap.set(`.title-${item.id}`, { opacity: 1 });
      gsap.set(`.description-${item.id}`, { opacity: 1 });
    });

    const createItemTimeline = (
      item: JourneyItem,
      startPos: number,
      endPos: number,
    ) => {
      const lineSelector = `.jl-${item.id}`;
      const dotSelector = `.jd-${item.id}`;
      const titleSelector = `.title-${item.id}`;
      const descriptionSelector = `.description-${item.id}`;

      const isTop = topJourneyData.some((topItem) => topItem.id === item.id);

      if (!isTop) {
        gsap.set(lineSelector, { transformOrigin: "top top" });
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: `${startPos}% 30%`,
          end: `${endPos}% 50%`,
          scrub: true,
        },
      });

      timeline
        .to(lineSelector, {
          scaleY: 1,
          duration: normalizedDuration * 0.4,
        })
        .to(
          dotSelector,
          {
            scale: 1,
            duration: normalizedDuration * 0.4,
          },
          "<",
        )
        .fromTo(
          titleSelector,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: normalizedDuration * 0.6,
            ease: "power2.out",
          },
          "<",
        )
        .fromTo(
          descriptionSelector,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: normalizedDuration * 0.6,
            ease: "power2.out",
          },
          "<",
        );

      return timeline;
    };

    const positions: ReadonlyArray<readonly [number, number]> =
      window.innerWidth < 600
        ? [
            [22, 32],
            [28, 38],
            [36, 46],
            [45, 55],
            [52, 62],
            [60, 70],
            [69, 79],
          ]
        : [
            [6, 26],
            [16, 36],
            [26, 46],
            [35, 55],
            [45, 65],
            [55, 75],
            [65, 85],
          ];

    journeyItems.forEach((item, index) => {
      const pos = positions[index] || [10 + index * 10, 30 + index * 10];
      createItemTimeline(item, pos[0], pos[1]);
    });

    const handleResize = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, { dependencies: [normalizedDuration, reducedMotion], scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      id="journey"
      className="h-[200vh] max-[600px]:h-[350vh] w-full relative"
      style={sectionStyle}
    >
      <div className="h-screen w-screen sticky top-0 left-1/2 -translate-x-1/2 pt-16 sm:pt-24 overflow-hidden">
        <div
          ref={wholeSliderRef}
          className="flex h-[75vh] sm:h-[70vh] w-[260vw] sm:w-[220vw] items-center gap-[4vw] px-[4vw] max-[600px]:w-[700vw] max-[600px]:px-[6vw]"
        >
          {/* Cover Hero Image Card */}
          <div className="h-[60vh] sm:h-[55vh] w-[28vw] shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] shadow-2xl max-[600px]:h-[50vh] max-[600px]:w-[80vw]">
            <img
              src={imageUrl}
              alt={imageAlt}
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="relative h-full w-full flex flex-col justify-center">
            {/* Center Horizontal Timeline Bar */}
            <div className="w-full absolute left-0 top-1/2 -translate-y-1/2 flex items-center h-fit z-0">
              <div
                className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                style={activeStyle}
              ></div>
              <div
                className="h-[2px] w-0 rounded-full journey-line"
                style={activeStyle}
              ></div>
              <div
                className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                style={activeStyle}
              ></div>
            </div>

            {/* Top Items Row */}
            <div className="flex h-1/2 w-full items-end justify-start gap-4 pb-6">
              <div className="h-full w-[20%] flex flex-col justify-end pr-4">
                <h2 className="font-display text-2xl sm:text-4xl font-semibold leading-tight">
                  {title}
                </h2>
              </div>

              <div className="w-full flex h-full gap-x-[12vw] max-[600px]:gap-x-[35vw]">
                {topJourneyData.map((item) => (
                  <div
                    key={`top-${item.id}`}
                    className="relative h-full w-[26vw] px-4 flex flex-col justify-end max-[600px]:w-[65vw]"
                  >
                    <div className="absolute left-0 bottom-0 top-0 w-full pointer-events-none">
                      <div
                        className={`w-3 h-3 -translate-x-1/2 absolute bottom-0 left-0 rounded-full shadow-sm jd-${item.id}`}
                        style={activeStyle}
                      ></div>
                      <div
                        className={`h-full w-[2px] -translate-x-1/2 absolute left-0 bottom-0 origin-bottom rounded-full jl-${item.id}`}
                        style={activeStyle}
                      ></div>
                    </div>

                    <div className="pb-4 space-y-1.5 pl-4">
                      <h4
                        className={`title-${item.id} font-display text-lg sm:text-2xl font-semibold leading-none`}
                      >
                        {item.year} {item.month}
                      </h4>
                      <p
                        className={`description-${item.id} text-xs sm:text-sm leading-relaxed max-w-[28ch]`}
                        style={mutedTextStyle}
                      >
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Items Row */}
            <div className="h-1/2 flex items-start justify-start w-full pt-6">
              <div className="w-[30%] pt-2 h-full">
                <p
                  className="font-mono text-sm sm:text-lg leading-none"
                  style={mutedTextStyle}
                >
                  {periodLabel}
                </p>
              </div>

              <div className="w-full flex h-full gap-x-[16vw] ml-[4vw] max-[600px]:gap-x-[35vw]">
                {bottomJourneyData.map((item) => (
                  <div
                    key={`bottom-${item.id}`}
                    className="relative h-full w-[24vw] px-4 flex flex-col justify-start max-[600px]:w-[65vw]"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-full pointer-events-none">
                      <div
                        className={`h-full w-[2px] -translate-x-1/2 absolute left-0 top-0 origin-top rounded-full jl-${item.id}`}
                        style={activeStyle}
                      ></div>
                      <div
                        className={`w-3 h-3 -translate-x-1/2 absolute top-0 left-0 rounded-full shadow-sm jd-${item.id}`}
                        style={activeStyle}
                      ></div>
                    </div>

                    <div className="pt-4 space-y-1.5 pl-4">
                      <h4
                        className={`title-${item.id} font-display text-lg sm:text-2xl font-semibold leading-none`}
                      >
                        {item.year} {item.month}
                      </h4>
                      <p
                        className={`description-${item.id} text-xs sm:text-sm leading-relaxed max-w-[28ch]`}
                        style={mutedTextStyle}
                      >
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

