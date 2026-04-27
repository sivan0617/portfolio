import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { MacbookScroll } from "@/components/ui/macbook-scroll";
import type { Locale } from "@/components/AboutContactPages";
import { toPublicAssetUrl } from "@/lib/utils";

type AboutRequestPayload = {
  label: string;
  sourceRect: DOMRect;
};

const copy = {
  zh: {
    name: "姚茜文 / Sivan",
    headline: "图像、镜头与视觉系统的个人档案。",
  },
  en: {
    name: "Yaoxiwen / Sivan",
    headline: "A personal archive for images, motion, and visual systems.",
  },
} as const;

const hoverLabels = {
  zh: [
    "视觉设计师 / Visual Designer",
    "品牌设计师 / Brand Designer",
    "平面设计师 / Graphic Designer",
    "动态设计师 / Motion Designer",
    "艺术指导 / Art Director",
  ],
  en: [
    "Visual Designer / 视觉设计师",
    "Brand Designer / 品牌设计师",
    "Graphic Designer / 平面设计师",
    "Motion Designer / 动态设计师",
    "Art Director / 艺术指导",
  ],
} as const;

const GLITCH_TOKENS = ["0", "1", "_", "-", "·"];

const linkedAnimationUrl = (locale: Locale) =>
  `${toPublicAssetUrl("/vendor/dual-wave/index.html")}?sequence=3&controlled=1&stage=preview&loop=1&input=none&locale=${locale}`;

export default function MacbookScrollDemo({
  locale,
  onAboutRequest,
}: {
  locale: Locale;
  onAboutRequest?: (payload: AboutRequestPayload) => void;
}) {
  const title = copy[locale];

  return (
    <div className="w-full overflow-hidden bg-black">
      <MacbookScroll
        title={
          <span className="sequence__macbook-title">
            <ArchiveNameLink name={title.name} locale={locale} onAboutRequest={onAboutRequest} />
            <span className="sequence__macbook-headline">{title.headline}</span>
          </span>
        }
        badge={<Badge className="h-10 w-10 -rotate-12 transform" />}
        screen={
          <iframe
            title="live linked animation inside MacBook"
            src={linkedAnimationUrl(locale)}
            className="sequence__macbook-screen-frame"
            scrolling="no"
          />
        }
        showGradient={false}
      />
    </div>
  );
}

function ArchiveNameLink({
  name,
  locale,
  onAboutRequest,
}: {
  name: string;
  locale: Locale;
  onAboutRequest?: (payload: AboutRequestPayload) => void;
}) {
  const [displayName, setDisplayName] = useState(name);
  const [previousName, setPreviousName] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const displayNameRef = useRef(name);
  const intervalRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const aboutTriggerLockRef = useRef(false);

  const clearPendingRolls = useCallback(() => {
    timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
    timeoutRefs.current = [];
  }, []);

  const stopLabelCycle = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    clearPendingRolls();
  }, [clearPendingRolls]);

  useEffect(() => {
    stopLabelCycle();
    displayNameRef.current = name;

    const resetFrame = window.requestAnimationFrame(() => {
      setDisplayName(name);
      setPreviousName(null);
      setIsRolling(false);
    });

    return () => {
      window.cancelAnimationFrame(resetFrame);
      stopLabelCycle();
    };
  }, [name, stopLabelCycle]);

  const releaseAboutTriggerLock = () => {
    window.setTimeout(() => {
      aboutTriggerLockRef.current = false;
    }, 900);
  };

  const startLabelCycle = () => {
    const labels = hoverLabels[locale];
    let index = 0;

    stopLabelCycle();
    showLabelWithGlitch(labels[index]);

    intervalRef.current = window.setInterval(() => {
      index = (index + 1) % labels.length;
      showLabelWithGlitch(labels[index]);
    }, 1600);
  };

  const resetLabel = () => {
    stopLabelCycle();
    displayNameRef.current = name;
    setDisplayName(name);
    setPreviousName(null);
    setIsRolling(false);
  };

  const rollToLabel = (label: string) => {
    setPreviousName(displayNameRef.current);
    displayNameRef.current = label;
    setDisplayName(label);
    setIsRolling(true);
  };

  const createGlitchLabel = (label: string) =>
    Array.from(label)
      .map((char, index) => {
        if (char === " " || char === "/") return char;
        const shouldGlitch = index % 5 === 1 && Math.random() > 0.62;
        if (!shouldGlitch) return char;
        return GLITCH_TOKENS[Math.floor(Math.random() * GLITCH_TOKENS.length)];
      })
      .join("");

  const showLabelWithGlitch = (label: string) => {
    clearPendingRolls();
    rollToLabel(createGlitchLabel(label));

    timeoutRefs.current.push(
      window.setTimeout(() => rollToLabel(label), 90),
      window.setTimeout(() => {
        setPreviousName(null);
        setIsRolling(false);
      }, 620),
    );
  };

  const requestAbout = (target: HTMLAnchorElement) => {
    if (aboutTriggerLockRef.current) return;

    aboutTriggerLockRef.current = true;

    if (onAboutRequest) {
      onAboutRequest({
        label: displayNameRef.current,
        sourceRect: target.getBoundingClientRect(),
      });
      releaseAboutTriggerLock();
      return;
    }

    window.location.hash = "#/about";
    releaseAboutTriggerLock();
  };

  const goToAbout = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    requestAbout(event.currentTarget);
  };

  useEffect(() => {
    const shouldAutoCycle = window.matchMedia("(max-width: 760px)").matches;
    if (!shouldAutoCycle) return;

    startLabelCycle();

    return () => {
      stopLabelCycle();
    };
  }, [locale, name]);

  return (
    <a
      className="sequence__macbook-name-link"
      href="#/about"
      data-route-transition="about-hero"
      aria-label={`${name}，进入关于页`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        requestAbout(event.currentTarget);
      }}
      onClick={goToAbout}
      onMouseEnter={startLabelCycle}
      onMouseLeave={resetLabel}
      onFocus={startLabelCycle}
      onBlur={resetLabel}
    >
      <span className="sequence__macbook-name-cue" aria-hidden="true">
        ABOUT
      </span>
      <span
        className={`sequence__macbook-name-slot ${isRolling ? "sequence__macbook-name-slot--rolling" : ""}`}
        aria-hidden="true"
      >
        {previousName ? (
          <span className="sequence__macbook-name-value sequence__macbook-name-value--previous">
            {previousName}
          </span>
        ) : null}
        <span className="sequence__macbook-name-value sequence__macbook-name-value--current" key={displayName}>
          {displayName}
        </span>
      </span>
    </a>
  );
}

const Badge = ({ className }: { className?: string }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="28" cy="28" r="28" fill="#D82020" />
      <circle cx="28" cy="28" r="26" fill="none" stroke="#7A0F0F" strokeWidth="2" />
      <text
        x="28"
        y="39"
        fill="white"
        fontSize="34"
        fontWeight="400"
        style={{ fontFamily: "var(--sequence-font)" }}
        textAnchor="middle"
      >
        S
      </text>
    </svg>
  );
};
