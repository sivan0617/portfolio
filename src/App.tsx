import { type CSSProperties, type MouseEvent, type TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { gsap } from "gsap";
import { AboutContactPages, InfoNav, type Locale } from "./components/AboutContactPages";
import MacbookScrollDemo from "./components/macbook-scroll-demo";
import { PROJECT_ASSET_LIBRARY } from "./data/projectAssetLibrary";
import { toPublicAssetUrl } from "./lib/utils";
import {
  getPublishedPortfolioVideo,
  isPublishedPortfolioVideo,
  resolvePlayablePortfolioVideoSrc,
  resolvePortfolioExtraAsset,
} from "./data/publishedMedia";

const FRAME_PATHS = {
  loader: toPublicAssetUrl("/vendor/loader/index.html"),
  dualWave: toPublicAssetUrl("/vendor/dual-wave/index.html"),
} as const;

const FRAME_TARGET_ORIGINS = (() => {
  if (typeof window === "undefined") {
    return ["http://127.0.0.1:5177", "http://localhost:5177"];
  }

  const port = window.location.port || "5177";
  const protocol = window.location.protocol;
  const origins = new Set<string>([
    window.location.origin,
    `${protocol}//127.0.0.1:${port}`,
    `${protocol}//localhost:${port}`,
  ]);

  try {
    if (document.referrer) {
      origins.add(new URL(document.referrer).origin);
    }
  } catch {
    // Ignore invalid referrer values.
  }

  return Array.from(origins);
})();

const FRAME_TARGET_ORIGIN = FRAME_TARGET_ORIGINS[0];

const isFrameOrigin = (origin: string) => FRAME_TARGET_ORIGINS.includes(origin);
const getFrameTargetOrigin = () => FRAME_TARGET_ORIGIN || "*";

const MESSAGE = {
  dualWaveReady: "sequence:dualWaveReady",
  loopStageReady: "sequence:loopStageReady",
  nextAnimation: "sequence:nextAnimation",
  openWorkDetail: "sequence:openWorkDetail",
  loopDelta: "sequence:loopDelta",
  loaderComplete: "sequence:loaderComplete",
  loaderProgress: "sequence:loaderProgress",
  setDualWaveProgress: "sequence:setDualWaveProgress",
  stageClick: "sequence:stageClick",
} as const;

const LOADING_ANIMATION_URL = `${FRAME_PATHS.loader}?sequence=1&loader=actual-home`;
const LINKED_ANIMATION_URL =
  `${FRAME_PATHS.dualWave}?sequence=3&controlled=1&stage=preview&loop=1&input=none`;
const THIRD_STAGE_INPUT_MODE: "parent" | "self" = "parent";
const THIRD_STAGE_BASE_URL = `${FRAME_PATHS.dualWave}?sequence=3&stage=third&loop=1&input=${THIRD_STAGE_INPUT_MODE}`;
const LOCALE_KEY = "sivan.locale";
const RXK_AUTOSTART_KEY = "sivan.rxk.autostart";

type ScreenTransition = {
  active: boolean;
  left: string;
  top: string;
  width: string;
  height: string;
  radius: string;
  opacity: number;
  contentOpacity: number;
  contentScale: number;
  progress: number;
  deviceOpacity: number;
  deviceBlur: string;
};

type ScreenTransitionStyle = CSSProperties & {
  "--sequence-transition-content-opacity": number;
  "--sequence-transition-content-scale": number;
  "--sequence-handoff-progress": number;
  "--sequence-handoff-device-opacity": number;
  "--sequence-handoff-device-blur": string;
};

type KineticTransitionStage = "idle" | "in" | "out";
type AboutEntryTransitionMode = "idle" | "visual";
type AboutHeroTransitionStage = "arming" | "growing" | "revealing" | "settling";
type CenterRouteTransitionPhase = "idle" | "covering" | "revealing";
type RectSnapshot = {
  left: number;
  top: number;
  width: number;
  height: number;
};
type AboutHeroTransitionState = {
  label: string;
  sourceRect: RectSnapshot;
  targetRect: RectSnapshot;
  stage: AboutHeroTransitionStage;
};
type CenterRouteTransitionState = {
  phase: CenterRouteTransitionPhase;
  targetRoute: string;
};
type WorkRapidTransitionState = {
  slug: string;
  media: CaseMedia[];
};

const emptyTransition: ScreenTransition = {
  active: false,
  left: "0px",
  top: "0px",
  width: "0px",
  height: "0px",
  radius: "0px",
  opacity: 0,
  contentOpacity: 0,
  contentScale: 1,
  progress: 0,
  deviceOpacity: 1,
  deviceBlur: "0px",
};

const kineticTransitionLines = [
  "SIVAN SIVAN SIVAN",
  "PORTFOLIO PORTFOLIO",
  "VISUAL SYSTEM VISUAL SYSTEM",
  "AIGC BRAND IMAGE",
  "SIGNAL SIGNAL SIGNAL",
  "MOTION MOTION MOTION",
  "SIVAN SIVAN SIVAN",
  "PORTFOLIO PORTFOLIO",
  "VISUAL SYSTEM VISUAL SYSTEM",
  "AIGC BRAND IMAGE",
  "SIGNAL SIGNAL SIGNAL",
  "MOTION MOTION MOTION",
];

const loaderStatusMessages = [
  "视觉档案初始化中",
  "正在读取海报与影像项目……",
  "正在挂载品牌视觉素材……",
  "正在同步作品索引……",
  "正在整理个人资料……",
  "档案已就绪",
];
const aboutTextWallLabels = {
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
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
const easeInOutCubic = (value: number) =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;
const px = (value: number) => `${Math.round(value)}px`;
const cssUrl = (value: string) => `url("${toPublicAssetUrl(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
const isMotionReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const HANDOFF_FINALIZE_MS = 900;
const HANDOFF_RELATED_THIRD_PROGRESS = 0.976;
const captureRect = ({ left, top, width, height }: DOMRect | RectSnapshot): RectSnapshot => ({
  left,
  top,
  width,
  height,
});
const getAboutHeroTargetRect = (): RectSnapshot => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const aspectRatio = 1.3636;
  let width = Math.min(544, viewportHeight * 0.48, viewportWidth * 0.46);
  let height = width * aspectRatio;
  const maxHeight = viewportHeight - Math.min(96, viewportHeight * 0.16);

  if (height > maxHeight) {
    height = maxHeight;
    width = height / aspectRatio;
  }

  return {
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
    width,
    height,
  };
};

type SequenceMessage = {
  type: string;
  slug?: string;
  [key: string]: unknown;
};

function postToFrame(
  frame: HTMLIFrameElement | null,
  message: SequenceMessage,
  targetOrigin: string,
) {
  const target = frame?.contentWindow;
  if (!target) return false;

  target.postMessage(message, targetOrigin);
  return true;
}

function AboutHeroTransitionOverlay({
  transition,
  locale,
}: {
  transition: AboutHeroTransitionState | null;
  locale: Locale;
}) {
  if (!transition) return null;

  const textWallLabels = aboutTextWallLabels[locale];

  const overlayStyle = {
    "--source-left": px(transition.sourceRect.left),
    "--source-top": px(transition.sourceRect.top),
    "--source-width": px(transition.sourceRect.width),
    "--source-height": px(transition.sourceRect.height),
    "--target-left": px(transition.targetRect.left),
    "--target-top": px(transition.targetRect.top),
    "--target-width": px(transition.targetRect.width),
    "--target-height": px(transition.targetRect.height),
  } as CSSProperties;

  return (
    <div
      className={`about-hero-transition about-hero-transition--${transition.stage}`}
      style={overlayStyle}
      aria-hidden="true"
    >
      <div className="about-hero-transition__box">
        <div className="about-hero-transition__textwall">
          {Array.from({ length: 13 }, (_, index) => (
            <span className="about-hero-transition__textline" key={`${textWallLabels[index % textWallLabels.length]}-${index}`}>
              {textWallLabels[index % textWallLabels.length]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CenterRouteTransitionOverlay({
  transition,
}: {
  transition: CenterRouteTransitionState | null;
}) {
  if (!transition) return null;

  return (
    <div
      className={`route-center-transition route-center-transition--${transition.phase}`}
      data-target-route={transition.targetRoute}
      aria-hidden="true"
    >
      <div className="route-center-transition__row" />
      <div className="route-center-transition__row" />
    </div>
  );
}

const getHashRoute = () => {
  if (typeof window === "undefined") return "/";

  return window.location.hash.replace(/^#/, "") || "/";
};

const prewarmAboutAssets = () => {
  if (typeof document === "undefined") return;

  [
    { href: toPublicAssetUrl("/about-gooey/app.js"), as: "script" },
    { href: toPublicAssetUrl("/about-gooey/img/tiles/woods/portrait.png"), as: "image" },
    { href: toPublicAssetUrl("/about-gooey/img/tiles/woods/code-hover.png"), as: "image" },
  ].forEach(({ href, as }) => {
    if (document.head.querySelector(`link[data-about-prewarm="${href}"]`)) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.href = href;
    link.as = as;
    link.dataset.aboutPrewarm = href;
    document.head.appendChild(link);
  });
};

const getSafeDecodedSlug = (value: string | undefined) => {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const readLocale = (): Locale => {
  if (typeof window === "undefined") return "zh";

  return window.localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "zh";
};

type RxkProject = {
  slug: string;
  title: string;
  titleEn: string;
  shortTitle: string;
  shortTitleEn: string;
  category: string;
  categoryEn: string;
  year: string;
  description: string;
  descriptionEn: string;
  image: string;
  clips?: Array<{ title: string; titleEn: string; video: string; poster: string }>;
  gallery: string[];
};

type LocalizedRxkProject = Omit<
  RxkProject,
  "titleEn" | "shortTitleEn" | "categoryEn" | "descriptionEn" | "clips"
> & {
  clips?: Array<{ title: string; video: string; poster: string }>;
};

type CaseMedia = {
  type: "image" | "video";
  src: string;
  poster: string;
  label: string;
};

type CaseExtraAsset = {
  type: "audio" | "document";
  src: string;
  label: string;
};

const detailCopy = {
  zh: {
    info: "信息",
    role: "职责",
    roles: ["概念", "美术指导", "AIGC 视觉", "动态影像"],
    awards: "奖项",
    none: "暂无",
    type: "类型",
    year: "年份",
    extras: "附件",
    audio: "音频",
    document: "文档",
    openFile: "打开文件",
    watchVideo: "前往 B站",
    last: "上一项",
    next: "下一项",
  },
  en: {
    info: "Info",
    role: "Role",
    roles: ["Concept", "Art Direction", "AIGC Visual", "Motion"],
    awards: "Awards",
    none: "N/A",
    type: "Type",
    year: "Year",
    extras: "Extras",
    audio: "Audio",
    document: "Document",
    openFile: "Open file",
    watchVideo: "Watch on Bilibili",
    last: "Last",
    next: "Next",
  },
} as const;

const uniquePaths = (paths: Array<string | undefined>) =>
  Array.from(new Set(paths.filter((path): path is string => Boolean(path))));

const getMediaFileName = (src: string) => {
  const rawName = src.split("/").pop() ?? src;
  try {
    return decodeURIComponent(rawName).replace(/\.[^.]+$/, "");
  } catch {
    return rawName.replace(/\.[^.]+$/, "");
  }
};

const portfolioImageExtPattern = /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i;

const getPortfolioWebImagePath = (src: string) => {
  if (!src.startsWith("/portfolio/") || !portfolioImageExtPattern.test(src)) return src;
  return src.replace(/^\/portfolio\//, "/portfolio-web/") + ".webp";
};

const getDerivedVideoPosterSource = (src: string) => `${src}.png`;
const getDerivedVideoPoster = (src: string) => getPortfolioWebImagePath(getDerivedVideoPosterSource(src));
const getPublishedVideoSources = (sources: string[] | undefined) => (sources ?? []).filter(isPublishedPortfolioVideo);
const getPlayableVideoUrl = (src: string) => {
  const localSrc = resolvePlayablePortfolioVideoSrc(src);
  return localSrc ? toPublicAssetUrl(localSrc) : null;
};
const canUseHoverPreview = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const uniqueMedia = (items: CaseMedia[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  });
};

const RAPID_LAYER_COUNT = 10;
const RAPID_PANEL_DELAY = 0.15;
const RAPID_DURATION = 1;

const getRapidLayerMedia = (slug: string, locale: Locale) => {
  const project = localizeRxkProject(
    rxkProjects.find((item) => item.slug === slug) ?? rxkProjects[0],
    locale,
  );
  const assetBundle = PROJECT_ASSET_LIBRARY[project.slug];
  const hasFolderAssets = Boolean(assetBundle && (assetBundle.image.length || assetBundle.video.length));
  const publishedVideos = getPublishedVideoSources(assetBundle?.video);
  const rawImageSources = hasFolderAssets
    ? uniquePaths([project.image, ...(assetBundle?.image ?? [])])
    : uniquePaths([project.image, ...project.gallery]);
  const derivedPosterSources = new Set(publishedVideos.map(getDerivedVideoPosterSource));
  const imageSources = rawImageSources
    .filter((src, index) => index === 0 || !derivedPosterSources.has(src))
    .map(getPortfolioWebImagePath);
  const assetPoster = imageSources[0] ?? getPortfolioWebImagePath(project.image);
  const folderVideos = new Set(publishedVideos);
  const manualClips = hasFolderAssets
    ? (project.clips ?? []).filter((clip) => folderVideos.has(clip.video))
    : project.clips ?? [];
  const manualClipVideos = new Set(manualClips.map((clip) => clip.video));
  const videoMedia: CaseMedia[] = [
    ...manualClips.map((clip) => ({
      type: "video" as const,
      src: clip.video,
      poster: getDerivedVideoPoster(clip.video),
      label: clip.title,
    })),
    ...publishedVideos
      .filter((src) => !manualClipVideos.has(src))
      .map((src, index) => ({
        type: "video" as const,
        src,
        poster: getDerivedVideoPoster(src),
        label: `${project.shortTitle} / ${getMediaFileName(src) || `video ${String(index + 1).padStart(2, "0")}`}`,
      })),
  ];
  const imageMedia: CaseMedia[] = imageSources.map((src, index) => ({
    type: "image" as const,
    src,
    poster: src,
    label: `${project.shortTitle} / frame ${String(index + 1).padStart(2, "0")}`,
  }));
  const previewCoverMedia: CaseMedia = {
    type: "image",
    src: assetPoster,
    poster: assetPoster,
    label: `${project.shortTitle} / preview`,
  };
  const rapidLayerSource = uniqueMedia([previewCoverMedia, ...imageMedia, ...videoMedia]);

  return Array.from(
    { length: RAPID_LAYER_COUNT },
    (_, index) => rapidLayerSource[index % rapidLayerSource.length] ?? previewCoverMedia,
  );
};

function RapidLayersTransition({
  media,
  onHalfway,
  onComplete,
}: {
  media: CaseMedia[];
  onHalfway: () => void;
  onComplete: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onHalfwayRef = useRef(onHalfway);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onHalfwayRef.current = onHalfway;
    onCompleteRef.current = onComplete;
  }, [onComplete, onHalfway]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const layers = Array.from(overlay.querySelectorAll<HTMLElement>(".rxk-rapid-transition__layer"));
    const images = Array.from(overlay.querySelectorAll<HTMLElement>(".rxk-rapid-transition__image"));
    const lastLayer = layers[layers.length - 1];
    const lastImage = images[images.length - 1];
    const tl = gsap.timeline({
      paused: false,
      onComplete: () => onCompleteRef.current(),
    });

    gsap.set(layers, { opacity: 1, y: "101%" });
    gsap.set(images, { y: "-101%" });
    layers.forEach((layer, index) => {
      tl.to([layer, images[index]], {
        duration: RAPID_DURATION,
        ease: "Power2.easeInOut",
        y: 0,
      }, RAPID_PANEL_DELAY * index);
    });

    tl.addLabel("halfway", RAPID_PANEL_DELAY * (layers.length - 1) + RAPID_DURATION)
      .call(() => {
        layers.slice(0, -1).forEach((layer) => gsap.set(layer, { opacity: 0 }));
        onHalfwayRef.current();
      }, undefined, "halfway")
      .to([lastLayer, lastImage], {
        duration: RAPID_DURATION,
        ease: "Expo.easeInOut",
        y: (index) => (index ? "101%" : "-101%"),
      }, "halfway");

    return () => {
      tl.kill();
    };
  }, [media]);

  return (
    <div className="rxk-rapid-transition" ref={overlayRef} aria-hidden="true">
      {media.map((item, index) => (
        <div
          className="rxk-rapid-transition__layer"
          key={`${item.src}-${index}`}
          style={{ "--rxk-rapid-index": index } as CSSProperties}
        >
          <div
            className="rxk-rapid-transition__image"
            style={{
              backgroundImage: cssUrl(item.type === "image" ? item.src : item.poster),
            }}
          >
            {item.type === "video" && getPlayableVideoUrl(item.src) ? (
              <video
                src={getPlayableVideoUrl(item.src) ?? undefined}
                poster={toPublicAssetUrl(item.poster)}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

const rxkProjects: RxkProject[] = [
  {
    slug: "kuang-brand",
    title: "品牌设计：礦-Kuang",
    titleEn: "Brand Design: KUANG",
    shortTitle: "礦-Kuang",
    shortTitleEn: "KUANG",
    category: "品牌设计：礦-kuang",
    categoryEn: "Brand Design: KUANG",
    year: "2026",
    description: "以矿物、水晶和冷白材质为视觉线索，完成品牌识别、包装、空间陈列与饰品宣发静帧的系统延展。",
    descriptionEn:
      "A brand system built around minerals, crystal, and cool white materiality, extending across identity, packaging, display, and campaign stills.",
    image: "/portfolio/kuang/礦品牌设计/封面.png",
    gallery: [
      "/portfolio/kuang/礦品牌设计/封面.png",
      "/portfolio/kuang/礦品牌设计/礦·Kuang 品牌色彩系统.jpg",
      "/portfolio/kuang/礦品牌设计/礦·Kuang 双层抽屉式包装3D渲染-开箱状态.png",
      "/portfolio/kuang/礦品牌设计/礦·Kuang 双层抽屉式包装结构设计-完整版.png",
      "/portfolio/kuang/礦品牌设计/礦·Kuang 购物袋系统设计.jpg",
      "/portfolio/kuang/礦品牌设计/Image 10.jpg",
      "/portfolio/kuang/礦品牌设计/Image 11.png",
      "/portfolio/kuang/礦-饰品宣发片/Image 3.png",
    ],
  },
  {
    slug: "mthayas-film",
    title: "藏x水晶服饰宣发片",
    titleEn: "Tibetan x Crystal Fashion Promo",
    shortTitle: "藏x水晶",
    shortTitleEn: "Tibetan x Crystal",
    category: "藏x水晶服饰宣发片",
    categoryEn: "Short-Film Concept",
    year: "2026",
    description: "围绕藏地服饰、水晶材质和自然地貌展开，用风、雪、湖面与织物层次建立带有仪式感的影像气质。",
    descriptionEn:
      "A moving-image direction shaped by Tibetan clothing, crystal materials, and natural landscapes, using wind, snow, lakes, and fabric layers to build a ritual mood.",
    image: "/portfolio/mthayas/1.1首帧图.png",
    clips: [
      {
        title: "成片",
        titleEn: "Final Film",
        video: "/portfolio/mthayas/成片.mp4",
        poster: "/portfolio/mthayas/1.1首帧图.png",
      },
      {
        title: "延展片段",
        titleEn: "Extended Cut",
        video: "/portfolio/mthayas/Video 11.mp4",
        poster: "/portfolio/mthayas/视频封面.jpg",
      },
    ],
    gallery: [
      "/portfolio/mthayas/1.1首帧图.png",
      "/portfolio/mthayas/视频封面.jpg",
      "/portfolio/mthayas/Bodnath nepal.jpg",
      "/portfolio/mthayas/左脸特写_头发飞动_16比9.png",
      "/portfolio/mthayas/成片-封面.jpg",
      "/portfolio/mthayas/拼布服饰_雪山行走场景.jpeg",
      "/portfolio/mthayas/湖畔极小身影.jpeg",
      "/portfolio/kuang/礦品牌设计/Image 10.jpg",
    ],
  },
  {
    slug: "redtail-intercept",
    title: "赤尾大广赛｜绝对拦截",
    titleEn: "Redtail Competition / Absolute Interception",
    shortTitle: "绝对拦截",
    shortTitleEn: "Absolute Interception",
    category: "赤尾大广赛",
    categoryEn: "Advertising Film",
    year: "2026",
    description: "以高速拦截为核心概念，强化武器运动、子弹轨迹和瞬间冲击力，形成更直接的广告记忆点。",
    descriptionEn:
      "An advertising concept built around high-speed interception, emphasizing weapon motion, bullet trajectory, and impact for a sharper memory point.",
    image: "/portfolio/redtail/参考图/IMG_0192.jpg",
    clips: [
      {
        title: "站内轻量版",
        titleEn: "Web Cut",
        video: "/portfolio/redtail/参考图/Video 3.mp4",
        poster: "/portfolio/redtail/参考图/IMG_0192.jpg",
      },
    ],
    gallery: [
      "/portfolio/redtail/参考图/IMG_0192.jpg",
      "/portfolio/redtail/参考图/Mark Generation.jpg",
      "/portfolio/redtail/参考图/Mark Generation.png",
      "/portfolio/redtail/参考图/Mark Generation_副本.png",
      "/portfolio/redtail/参考图/Gemini_Generated_Image_634guw634guw634g.png",
      "/portfolio/redtail/参考图/Gemini_Generated_Image_6be0cb6be0cb6be0.png",
      "/portfolio/redtail/参考图/子弹薄膜拦截侧面视角.png",
      "/portfolio/redtail/参考图/尾帧图 换子弹.jpeg",
    ],
  },
  {
    slug: "poster-pixel-exhibition",
    title: "海报 / 像素展览",
    titleEn: "Posters / Pixel Exhibition",
    shortTitle: "像素展览",
    shortTitleEn: "Pixel Exhibition",
    category: "海报 / 像素展览",
    categoryEn: "Pixel Exhibition",
    year: "2025",
    description: "像素风与视觉噪声交叠，探索介于游戏语法与商业视觉之间的海报语言。",
    descriptionEn:
      "An overlap of pixel language and visual noise, exploring poster language between game aesthetics and commercial visuals.",
    image: "/portfolio/posters/像素展览/ChatGPT Image 2026年4月26日 12_20_13.png",
    gallery: [
      "/portfolio/posters/像素展览/ChatGPT Image 2026年4月26日 12_20_13.png",
      "/portfolio/posters/像素展览/ChatGPT Image 2026年4月26日 12_20_16.png",
      "/portfolio/posters/像素展览/ChatGPT Image 2026年4月26日 12_20_18.png",
      "/portfolio/posters/像素展览/ChatGPT Image 2026年4月26日 12_20_21.png",
      "/portfolio/posters/像素展览/ChatGPT Image 2026年4月26日 12_22_05.png",
      "/portfolio/posters/像素展览/ChatGPT Image 2026年4月26日 12_26_33.png",
      "/portfolio/posters/像素展览/ChatGPT Image 2026年4月26日 12_36_02.png",
    ],
  },
  {
    slug: "poster-other-series",
    title: "海报 / 其他",
    titleEn: "Posters / Other Series",
    shortTitle: "其他",
    shortTitleEn: "Other Series",
    category: "海报 / 其他",
    categoryEn: "Other Series",
    year: "2025",
    description: "杂项海报场景的合集，用不同视觉策略承接不同品牌语境。",
    descriptionEn:
      "A mixed poster collection covering varied visual strategies across multiple brand situations.",
    image: "/portfolio/posters/其他/Image 2.png",
    gallery: [
      "/portfolio/posters/其他/Image 2.png",
      "/portfolio/posters/其他/export_副本.png",
      "/portfolio/posters/其他/江南造船厂海报.png",
    ],
  },
  {
    slug: "poster-organ-show",
    title: "海报 / 器官展",
    titleEn: "Posters / Organ Exhibition",
    shortTitle: "器官展",
    shortTitleEn: "Organ Study",
    category: "海报 / 器官展",
    categoryEn: "Organ Study",
    year: "2025",
    description: "器官、解剖结构与抽象几何的视觉拼贴，尝试兼顾冷静科学感和感官冲击。",
    descriptionEn:
      "Visual collages from organ and anatomical motifs balancing scientific restraint with visual impact.",
    image: "/portfolio/posters/器官展/ChatGPT Image 2026年4月26日 12_34_47.png",
    gallery: [
      "/portfolio/posters/器官展/ChatGPT Image 2026年4月26日 12_34_47.png",
      "/portfolio/posters/器官展/ChatGPT Image 2026年4月26日 12_56_53.png",
      "/portfolio/posters/器官展/ChatGPT Image 2026年4月26日 12_57_57.png",
      "/portfolio/posters/器官展/ChatGPT Image 2026年4月26日 12_58_59.png",
    ],
  },
  {
    slug: "poster-experimental-series",
    title: "海报 / 实验海报",
    titleEn: "Posters / Experimental Series",
    shortTitle: "实验海报",
    shortTitleEn: "Experimental",
    category: "海报 / 实验海报",
    categoryEn: "Experimental Posters",
    year: "2025",
    description: "故障化、赛博、重构式叙事的实验海报方向，强调视觉噪点与符号转换。",
    descriptionEn:
      "An experimental poster direction blending glitch, cyber motifs, and symbolic transformations.",
    image: "/portfolio/posters/实验海报/Image 1_副本.png",
    gallery: [
      "/portfolio/posters/实验海报/Image 1_副本.png",
      "/portfolio/posters/实验海报/Image 2_副本.png",
      "/portfolio/posters/实验海报/故障艺术人物海报.png",
      "/portfolio/posters/实验海报/Image.jpg",
      "/portfolio/posters/实验海报/Y2K赛博朋克复古广告海报.png",
      "/portfolio/posters/实验海报/先锋艺术实验海报.jpeg",
      "/portfolio/posters/实验海报/赛博朋克监控风格海报.jpeg",
    ],
  },
  {
    slug: "poster-fresh",
    title: "海报 / 清鲜",
    titleEn: "Posters / Fresh",
    shortTitle: "清鲜",
    shortTitleEn: "Fresh",
    category: "海报 / 清鲜",
    categoryEn: "Fresh",
    year: "2025",
    description: "轻盈明亮的消费向图像语言，强调质感、结构化留白与快速识别性。",
    descriptionEn:
      "Bright, light poster language focused on texture, structured negative space, and fast readability.",
    image: "/portfolio/posters/清鲜/ChatGPT Image 2026年4月26日 12_14_25.png",
    gallery: [
      "/portfolio/posters/清鲜/ChatGPT Image 2026年4月26日 12_14_25.png",
      "/portfolio/posters/清鲜/ChatGPT Image 2026年4月26日 12_14_28.png",
      "/portfolio/posters/清鲜/ChatGPT Image 2026年4月26日 12_14_31.png",
      "/portfolio/posters/清鲜/ChatGPT Image 2026年4月26日 12_14_33.png",
      "/portfolio/posters/清鲜/ChatGPT Image 2026年4月26日 12_14_40.png",
      "/portfolio/posters/清鲜/ChatGPT Image 2026年4月26日 12_14_43.png",
      "/portfolio/posters/清鲜/ChatGPT Image 2026年4月26日 12_14_46.png",
    ],
  },
  {
    slug: "poster-art-hand",
    title: "海报 / 艺术手法",
    titleEn: "Posters / Artistic Technique",
    shortTitle: "艺术手法",
    shortTitleEn: "Art Technique",
    category: "海报 / 艺术手法",
    categoryEn: "Art Techniques",
    year: "2025",
    description: "强调构图实验、字体处理和艺术语言的系列，偏向当代视觉实验。",
    descriptionEn:
      "A series prioritizing composition experiments, type play, and contemporary visual craftsmanship.",
    image: "/portfolio/posters/艺术手法/ChatGPT Image 2026年4月26日 12_56_23.png",
    gallery: [
      "/portfolio/posters/艺术手法/ChatGPT Image 2026年4月26日 12_56_23.png",
      "/portfolio/posters/艺术手法/ChatGPT Image 2026年4月26日 13_21_07.png",
      "/portfolio/posters/艺术手法/ChatGPT Image 2026年4月26日 13_21_11.png",
      "/portfolio/posters/艺术手法/ChatGPT Image 2026年4月26日 13_21_14.png",
      "/portfolio/posters/艺术手法/ChatGPT Image 2026年4月26日 13_21_16.png",
      "/portfolio/posters/艺术手法/ChatGPT Image 2026年4月26日 13_21_19.png",
      "/portfolio/posters/艺术手法/ChatGPT Image 2026年4月26日 13_22_19.png",
    ],
  },
  {
    slug: "poster-solar",
    title: "海报 / 节气",
    titleEn: "Posters / Seasonal Rhythm",
    shortTitle: "节气",
    shortTitleEn: "Seasonal",
    category: "海报 / 节气",
    categoryEn: "Seasonal Rhythm",
    year: "2025",
    description: "以节气节奏为切片，建立自然周期感和消费场景转译的双向视觉。",
    descriptionEn:
      "A seasonal rhythm-based style translating natural cycles into consumer visuals.",
    image: "/portfolio/posters/节气/ChatGPT Image 2026年4月26日 12_25_18.png",
    gallery: [
      "/portfolio/posters/节气/ChatGPT Image 2026年4月26日 12_25_18.png",
      "/portfolio/posters/节气/ChatGPT Image 2026年4月26日 12_25_23.png",
      "/portfolio/posters/节气/ChatGPT Image 2026年4月26日 12_25_27.png",
      "/portfolio/posters/节气/ChatGPT Image 2026年4月26日 12_25_30.png",
      "/portfolio/posters/节气/ChatGPT Image 2026年4月26日 12_25_36.png",
      "/portfolio/posters/节气/ChatGPT Image 2026年4月26日 12_35_38.png",
    ],
  },
  {
    slug: "poster-misc",
    title: "海报 / 散记",
    titleEn: "Posters / Misc",
    shortTitle: "散记",
    shortTitleEn: "Misc",
    category: "海报 / 散记",
    categoryEn: "Misc",
    year: "2025",
    description: "灵感随手记录与快速迭代合集，涵盖轻商业与实验性小型试验。",
    descriptionEn:
      "Quickly iterated posters and idea-driven snippets across light commercial and experimental directions.",
    image: "/portfolio/posters/零散/Image 7.png",
    gallery: [
      "/portfolio/posters/零散/Image 7.png",
      "/portfolio/posters/零散/Image 8.png",
      "/portfolio/posters/零散/Image 9.png",
      "/portfolio/posters/零散/商午菌宴传单_修正版.jpeg",
      "/portfolio/posters/零散/猫咪零食海报4K.png",
      "/portfolio/posters/零散/WechatIMG719.jpeg",
    ],
  },
  {
    slug: "comic-series",
    title: "漫画 / 分镜图像",
    titleEn: "Comics / Sequential Images",
    shortTitle: "漫画",
    shortTitleEn: "Comics",
    category: "漫画 / 分镜图像",
    categoryEn: "Sequential Images",
    year: "2026",
    description: "以连续画面、镜头节奏和叙事切片为核心的漫画式图像实验。",
    descriptionEn:
      "Sequential image experiments built around frame rhythm, visual beats, and narrative fragments.",
    image: "/portfolio/comics/ChatGPT Image 2026年4月23日 13_20_45.png",
    gallery: ["/portfolio/comics/ChatGPT Image 2026年4月23日 13_20_45.png"],
  },
  {
    slug: "experimental-dimensional",
    title: "实验短片 / 次元壁",
    titleEn: "Experimental: Dimensional Wall",
    shortTitle: "次元壁",
    shortTitleEn: "A",
    category: "实验 A 片",
    categoryEn: "Experimental A",
    year: "2026",
    description: "围绕视觉空间结构和梦境场景展开的实验性动效，测试镜位重构、视差位移与异次元叙事的衔接。",
    descriptionEn: "An experimental motion study on visual space, dreamlike scenes, parallax shifts, and cross-dimensional transitions.",
    image: "/portfolio/experimental/次元壁/cover.png",
    clips: [
      {
        title: "手绘信件场景",
        titleEn: "Hand-Drawn Letter Scene",
        video: "/portfolio/experimental/次元壁/手绘风格女孩读信视频生成_cleaned.mp4",
        poster: "/portfolio/experimental/次元壁/cover.png",
      },
    ],
    gallery: [
      "/portfolio/experimental/次元壁/cover.png",
      "/portfolio/experimental/次元壁/cover.png",
      "/portfolio/experimental/次元壁/cover.png",
    ],
  },
  {
    slug: "experimental-fantasy",
    title: "实验短片 / 异世界",
    titleEn: "Experimental: Other World",
    shortTitle: "异世界",
    shortTitleEn: "B",
    category: "实验 B 片",
    categoryEn: "Experimental B",
    year: "2026",
    description: "聚焦现实与异界交错的速度感与情绪，偏向叙事切片的连续运动、场景转场与动态冲击。",
    descriptionEn:
      "Focused on speed, tension, and emotional shifts between reality and fantasy through sequential motion transitions.",
    image: "/portfolio/experimental/异世界/cover.png",
    clips: [
      {
        title: "异世界骑行断面",
        titleEn: "World-Break Ride Fragment",
        video: "/portfolio/experimental/异世界/Motorcycle_crashes_into_202604261650_cleaned.mp4",
        poster: "/portfolio/experimental/异世界/cover.png",
      },
    ],
    gallery: [
      "/portfolio/experimental/异世界/cover.png",
      "/portfolio/experimental/异世界/cover.png",
    ],
  },
  {
    slug: "experimental-mood",
    title: "实验短片 / 情绪",
    titleEn: "Experimental: Mood",
    shortTitle: "情绪",
    shortTitleEn: "C",
    category: "实验 C 片",
    categoryEn: "Experimental C",
    year: "2026",
    description: "偏重人物情绪动作拆解与色彩气氛的实验影像，利用微小尺度运动建立重复与停顿之间的节律。",
    descriptionEn:
      "Emotion-led motion experiments that build rhythm from micro-actions and color mood using pauses and repetitions.",
    image: "/portfolio/experimental/情绪/cover.png",
    clips: [
      {
        title: "丁达尔效应实验",
        titleEn: "Tyndall Effect Study",
        video: "/portfolio/experimental/情绪/视频生成：翻书的丁达尔效应_cleaned.mp4",
        poster: "/portfolio/experimental/情绪/cover.png",
      },
    ],
    gallery: [
      "/portfolio/experimental/情绪/cover.png",
      "/portfolio/experimental/情绪/cover.png",
    ],
  },
  {
    slug: "experimental-misc",
    title: "实验短片 / 杂",
    titleEn: "Experimental: Misc",
    shortTitle: "杂",
    shortTitleEn: "D",
    category: "实验 D 片",
    categoryEn: "Experimental D",
    year: "2026",
    description: "收录碎片化实验素材的合集，用于测试异常视觉、数字故障化和人物消解的镜头风格。",
    descriptionEn:
      "A mixed set of experimental fragments testing glitch aesthetics, digital artifacts, and character abstraction.",
    image: "/portfolio/experimental/杂/cover.png",
    clips: [
      {
        title: "数字消解片段",
        titleEn: "Digital Disintegration Clip",
        video: "/portfolio/experimental/杂/Man_vanishing_into_202604202143_cleaned.MP4",
        poster: "/portfolio/experimental/杂/cover.png",
      },
    ],
    gallery: [
      "/portfolio/experimental/杂/cover.png",
      "/portfolio/experimental/杂/cover.png",
    ],
  },
];

const localizeRxkProject = (project: RxkProject, locale: Locale): LocalizedRxkProject => {
  if (locale !== "en") return project;

  return {
    ...project,
    title: project.titleEn,
    shortTitle: project.shortTitleEn,
    category: project.categoryEn,
    description: project.descriptionEn,
    clips: project.clips?.map((clip) => ({
      ...clip,
      title: clip.titleEn,
    })),
  };
};

function RxkCasePrototype({
  locale,
  onLocaleToggle,
  workSlug,
  onWorkDetailRequest,
}: {
  locale: Locale;
  onLocaleToggle: () => void;
  workSlug?: string;
  onWorkDetailRequest?: (slug: string) => void;
}) {
  const shouldAutostartInitial =
    typeof window !== "undefined" && window.sessionStorage.getItem(RXK_AUTOSTART_KEY) === "1";
  const shouldAutostart = useRef(shouldAutostartInitial);
  const [detailOpen] = useState(true);
  const [rapidPhase, setRapidPhase] = useState<"idle" | "running">(
    () => (shouldAutostartInitial ? "running" : "idle"),
  );
  const [offset, setOffset] = useState(0);
  const [stretch, setStretch] = useState(1);
  const stageRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rapidOverlayRef = useRef<HTMLDivElement>(null);
  const rapidTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const targetOffsetRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const targetStretchRef = useRef(1);
  const currentStretchRef = useRef(1);
  const cycleHeightRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [hoverPreviewEnabled, setHoverPreviewEnabled] = useState(canUseHoverPreview);
  const [hoveredPublishedVideo, setHoveredPublishedVideo] = useState<string | null>(null);
  const activeProject = localizeRxkProject(
    rxkProjects.find((project) => project.slug === workSlug) ?? rxkProjects[0],
    locale,
  );
  const activeProjectIndex = Math.max(
    0,
    rxkProjects.findIndex((project) => project.slug === activeProject.slug),
  );
  const previousProject = rxkProjects[(activeProjectIndex - 1 + rxkProjects.length) % rxkProjects.length];
  const nextProject = rxkProjects[(activeProjectIndex + 1) % rxkProjects.length];
  const copy = detailCopy[locale];
  const assetBundle = PROJECT_ASSET_LIBRARY[activeProject.slug];
  const hasFolderAssets = Boolean(assetBundle && (assetBundle.image.length || assetBundle.video.length));
  const publishedVideos = getPublishedVideoSources(assetBundle?.video);
  const rawImageSources = hasFolderAssets
    ? uniquePaths([activeProject.image, ...(assetBundle?.image ?? [])])
    : uniquePaths([activeProject.image, ...activeProject.gallery]);
  const derivedPosterSources = new Set(publishedVideos.map(getDerivedVideoPosterSource));
  const imageSources = rawImageSources
    .filter((src, index) => index === 0 || !derivedPosterSources.has(src))
    .map(getPortfolioWebImagePath);
  const assetPoster = imageSources[0] ?? getPortfolioWebImagePath(activeProject.image);
  const folderVideos = new Set(publishedVideos);
  const folderAudios = uniquePaths(assetBundle?.audio ?? []);
  const folderDocuments = uniquePaths(assetBundle?.document ?? []);
  const manualClips = hasFolderAssets
    ? (activeProject.clips ?? []).filter((clip) => folderVideos.has(clip.video))
    : activeProject.clips ?? [];
  const manualClipVideos = new Set(manualClips.map((clip) => clip.video));
  const videoMedia: CaseMedia[] = [
    ...manualClips.map((clip) => ({
      type: "video" as const,
      src: clip.video,
      poster: getDerivedVideoPoster(clip.video),
      label: clip.title,
    })),
    ...publishedVideos
      .filter((src) => !manualClipVideos.has(src))
      .map((src, index) => ({
        type: "video" as const,
        src,
        poster: getDerivedVideoPoster(src),
        label: `${activeProject.shortTitle} / ${getMediaFileName(src) || `video ${String(index + 1).padStart(2, "0")}`}`,
      })),
  ];
  const imageMedia: CaseMedia[] = imageSources.map((src, index) => ({
    type: "image" as const,
    src,
    poster: src,
    label: `${activeProject.shortTitle} / frame ${String(index + 1).padStart(2, "0")}`,
  }));
  const extraAssets: CaseExtraAsset[] = [
    ...folderAudios.map((src, index) => ({
      type: "audio" as const,
      src: resolvePortfolioExtraAsset(src) ?? "",
      label: `${activeProject.shortTitle} / audio ${String(index + 1).padStart(2, "0")} / ${getMediaFileName(src)}`,
    })),
    ...folderDocuments.map((src, index) => ({
      type: "document" as const,
      src: resolvePortfolioExtraAsset(src) ?? "",
      label: `${activeProject.shortTitle} / doc ${String(index + 1).padStart(2, "0")} / ${getMediaFileName(src)}`,
    })),
  ].filter((asset) => Boolean(asset.src));

  const previewCoverMedia: CaseMedia = {
    type: "image",
    src: assetPoster,
    poster: assetPoster,
    label: `${activeProject.shortTitle} / preview`,
  };
  const isVideoDominantProject = imageSources.length <= 1 && videoMedia.length > 0;
  const baseMedia = isVideoDominantProject
    ? uniqueMedia([previewCoverMedia, ...videoMedia])
    : uniqueMedia([...imageMedia, ...videoMedia]);
  const cycleSize = baseMedia.length;
  const media = [...baseMedia, ...baseMedia, ...baseMedia];
  const rapidLayerSource = uniqueMedia([
    previewCoverMedia,
    ...imageMedia,
    ...videoMedia,
  ]);
  const rapidLayerMedia = Array.from(
    { length: RAPID_LAYER_COUNT },
    (_, index) => rapidLayerSource[index % rapidLayerSource.length] ?? previewCoverMedia,
  );
  const rapidHalfwayMs = RAPID_PANEL_DELAY * 1000 * (rapidLayerMedia.length - 1) + RAPID_DURATION * 1000;
  useEffect(() => {
    const isMobileViewport = window.matchMedia("(max-width: 900px)").matches;
    if (!isMobileViewport) {
      document.body.classList.add("rxk-case-locked");
    }
    if (shouldAutostart.current) {
      window.sessionStorage.removeItem(RXK_AUTOSTART_KEY);
    }

    return () => {
      document.body.classList.remove("rxk-case-locked");
      rapidTimelineRef.current?.kill();
    };
  }, []);

  const rapidOverlay = rapidPhase !== "idle" ? (
    <div className="rxk-rapid-transition" data-phase={rapidPhase} ref={rapidOverlayRef} aria-hidden="true">
      {rapidLayerMedia.map((item, index) => (
        <div
          className="rxk-rapid-transition__layer"
          key={`${item.src}-${index}`}
          style={{ "--rxk-rapid-index": index } as CSSProperties}
        >
          <div
            className="rxk-rapid-transition__image"
            style={{
              backgroundImage: cssUrl(item.type === "image" ? item.src : item.poster || assetPoster),
            }}
          >
            {item.type === "video" && getPlayableVideoUrl(item.src) ? (
              <video
                src={getPlayableVideoUrl(item.src) ?? undefined}
                poster={toPublicAssetUrl(item.poster)}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  ) : null;

  useEffect(() => {
    if (rapidPhase !== "running") return;

    const overlay = rapidOverlayRef.current;
    if (!overlay) return;

    const layers = Array.from(overlay.querySelectorAll<HTMLElement>(".rxk-rapid-transition__layer"));
    const images = Array.from(overlay.querySelectorAll<HTMLElement>(".rxk-rapid-transition__image"));
    const lastLayer = layers[layers.length - 1];
    const lastImage = images[images.length - 1];
    const tl = gsap.timeline({
      paused: false,
      onComplete: () => {
        setRapidPhase("idle");
        rapidTimelineRef.current = null;
      },
    });

    rapidTimelineRef.current = tl;
    gsap.set(layers, { opacity: 1, y: "101%" });
    gsap.set(images, { y: "-101%" });
    layers.forEach((layer, index) => {
      tl.to([layer, images[index]], {
        duration: RAPID_DURATION,
        ease: "Power2.easeInOut",
        y: 0,
      }, RAPID_PANEL_DELAY * index);
    });

    tl.addLabel("halfway", rapidHalfwayMs / 1000)
      .call(() => {
        layers.slice(0, -1).forEach((layer) => gsap.set(layer, { opacity: 0 }));
      }, undefined, "halfway")
      .to([lastLayer, lastImage], {
        duration: RAPID_DURATION,
        ease: "Expo.easeInOut",
        y: (index) => (index ? "101%" : "-101%"),
      }, "halfway");

    return () => {
      tl.kill();
    };
  }, [rapidHalfwayMs, rapidPhase]);

  useEffect(() => {
    const mediaQuery =
      typeof window === "undefined" ? null : window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncHoverPreview = () => {
      const nextValue = canUseHoverPreview();
      setHoverPreviewEnabled(nextValue);
      if (!nextValue) {
        setHoveredPublishedVideo(null);
      }
    };

    syncHoverPreview();
    mediaQuery?.addEventListener("change", syncHoverPreview);

    return () => mediaQuery?.removeEventListener("change", syncHoverPreview);
  }, []);

  useEffect(() => {
    setHoveredPublishedVideo(null);
  }, [activeProject.slug]);

  useEffect(() => {
    if (!detailOpen) {
      targetOffsetRef.current = 0;
      currentOffsetRef.current = 0;
      targetStretchRef.current = 1;
      currentStretchRef.current = 1;
      lastTickRef.current = null;
      setOffset(0);
      setStretch(1);
      return;
    }

    targetOffsetRef.current = 0;
    currentOffsetRef.current = 0;
    targetStretchRef.current = 1;
    currentStretchRef.current = 1;
    lastTickRef.current = null;
    setOffset(0);
    setStretch(1);
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    if (window.matchMedia("(max-width: 900px)").matches) {
      return;
    }

    const normalizeLoopOffset = (value: number, cycle = cycleHeightRef.current) => {
      if (!Number.isFinite(value) || cycle <= 0) return 0;
      return ((value % cycle) + cycle) % cycle;
    };

    const foldLoopState = () => {
      const cycle = cycleHeightRef.current;
      if (cycle <= 0) return;

      const wraps = Math.floor(targetOffsetRef.current / cycle);
      if (wraps !== 0) {
        const shift = wraps * cycle;
        targetOffsetRef.current -= shift;
        currentOffsetRef.current -= shift;
      }
    };

    const measure = () => {
      const stage = stageRef.current;
      const track = trackRef.current;
      if (!stage || !track) return;

      const cycleStart = track.children[0] as HTMLElement | undefined;
      const cycleEnd = track.children[cycleSize] as HTMLElement | undefined;
      const measuredCycle =
        cycleStart && cycleEnd ? cycleEnd.offsetTop - cycleStart.offsetTop : track.scrollHeight / 3;
      cycleHeightRef.current = Math.max(1, measuredCycle);
      foldLoopState();
      setOffset(normalizeLoopOffset(currentOffsetRef.current));
    };

    const render = (timestamp: number) => {
      const lastTick = lastTickRef.current ?? timestamp;
      const elapsed = Math.min(0.08, Math.max(0, (timestamp - lastTick) / 1000));
      lastTickRef.current = timestamp;
      targetOffsetRef.current += elapsed * 18;
      foldLoopState();

      const next = currentOffsetRef.current + (targetOffsetRef.current - currentOffsetRef.current) * 0.1;
      currentOffsetRef.current = Math.abs(targetOffsetRef.current - next) < 0.08 ? targetOffsetRef.current : next;
      targetStretchRef.current += (1 - targetStretchRef.current) * Math.min(1, elapsed * 7.5);
      currentStretchRef.current += (targetStretchRef.current - currentStretchRef.current) * 0.16;
      setOffset(normalizeLoopOffset(currentOffsetRef.current));
      setStretch(Number(currentStretchRef.current.toFixed(4)));
      frameRef.current = window.requestAnimationFrame(render);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetOffsetRef.current += event.deltaY;
      targetStretchRef.current = Math.max(
        targetStretchRef.current,
        1 + Math.min(0.18, Math.abs(event.deltaY) / 2200),
      );
      foldLoopState();
    };

    measure();
    const firstCycleItems = Array.from(trackRef.current?.children ?? []).slice(0, cycleSize);
    const measuredTrack = trackRef.current;
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            measure();
          });
    firstCycleItems.forEach((item) => resizeObserver?.observe(item));
    measuredTrack?.querySelectorAll("img, video").forEach((node) => {
      node.addEventListener("load", measure);
      node.addEventListener("loadedmetadata", measure);
    });
    frameRef.current = window.requestAnimationFrame(render);
    window.addEventListener("resize", measure);
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      resizeObserver?.disconnect();
      measuredTrack?.querySelectorAll("img, video").forEach((node) => {
        node.removeEventListener("load", measure);
        node.removeEventListener("loadedmetadata", measure);
      });
      window.removeEventListener("resize", measure);
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [activeProject.slug, cycleSize, detailOpen]);

  const handleDetailNavClick = (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !onWorkDetailRequest
    ) {
      return;
    }

    event.preventDefault();
    onWorkDetailRequest(slug);
  };

  const requestDetailProject = (slug: string) => {
    if (onWorkDetailRequest) {
      onWorkDetailRequest(slug);
      return;
    }

    window.location.hash = `#/work/${slug}`;
  };

  const handleDetailTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    if (event.touches.length !== 1) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button, input, textarea, select, audio, video")) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleDetailTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!window.matchMedia("(max-width: 900px)").matches) return;

    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 72 || absX < absY * 1.35) return;

    event.preventDefault();
    requestDetailProject(deltaX < 0 ? nextProject.slug : previousProject.slug);
  };

  const detailPage = (
    <main
      className="rxk-detail-page"
      data-locale={locale}
      aria-label="project detail prototype"
      onTouchStart={handleDetailTouchStart}
      onTouchEnd={handleDetailTouchEnd}
    >
      <InfoNav locale={locale} onLocaleToggle={onLocaleToggle} />

      <section
        className="rxk-detail-page__stage"
        ref={stageRef}
        style={
          {
            "--rxk-y": `${offset}px`,
            "--rxk-stretch": stretch,
          } as CSSProperties
        }
      >
        <div className="rxk-detail-page__left" data-lenis-prevent-touch>
          <div className="rxk-detail-page__track" ref={trackRef}>
            {media.map((item, index) => (
              <figure className="rxk-detail-page__media" key={`${item.src}-${index}`}>
                {item.type === "video" && getPlayableVideoUrl(item.src) ? (
                  <video
                    src={getPlayableVideoUrl(item.src) ?? undefined}
                    poster={toPublicAssetUrl(item.poster)}
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="metadata"
                  />
                ) : item.type === "video" && getPublishedPortfolioVideo(item.src) ? (
                  <div
                    className="rxk-detail-page__published-video"
                    onMouseEnter={() => {
                      if (hoverPreviewEnabled) {
                        setHoveredPublishedVideo(item.src);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredPublishedVideo((current) => (current === item.src ? null : current));
                    }}
                  >
                    <img src={toPublicAssetUrl(item.poster)} alt="" loading={index < 2 ? "eager" : "lazy"} decoding="async" />
                    {hoverPreviewEnabled && hoveredPublishedVideo === item.src ? (
                      <iframe
                        className="rxk-detail-page__published-player"
                        title={`${item.label} preview`}
                        src={`${getPublishedPortfolioVideo(item.src)?.embedUrl}&autoplay=1&muted=1&danmaku=0`}
                        loading="lazy"
                        allow="autoplay; fullscreen; picture-in-picture"
                      />
                    ) : null}
                    <a
                      className="rxk-detail-page__media-link"
                      href={getPublishedPortfolioVideo(item.src)?.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${copy.watchVideo}: ${item.label}`}
                      onFocus={() => {
                        if (hoverPreviewEnabled) {
                          setHoveredPublishedVideo(item.src);
                        }
                      }}
                      onBlur={() => {
                        setHoveredPublishedVideo((current) => (current === item.src ? null : current));
                      }}
                    >
                      <span className="rxk-detail-page__media-chip">{copy.watchVideo}</span>
                    </a>
                  </div>
                ) : (
                  <img src={toPublicAssetUrl(item.src)} alt="" loading={index < 2 ? "eager" : "lazy"} decoding="async" />
                )}
              </figure>
            ))}
          </div>
        </div>

        <aside className="rxk-detail-page__right">
          <div className="rxk-detail-page__top">
            <h1>{activeProject.shortTitle}</h1>
            <div className="rxk-detail-page__meta">
              <div className="rxk-detail-page__meta-info">
                <h2>{copy.info}</h2>
                <p>{activeProject.description}</p>
              </div>
              <div className="rxk-detail-page__meta-role">
                <h2>{copy.role}</h2>
                <ul>
                  {copy.roles.map((role) => (
                    <li key={role}>{role}</li>
                  ))}
                </ul>
              </div>
              {extraAssets.length ? (
                <div className="rxk-detail-page__resources">
                  <h2>{copy.extras}</h2>
                  <div className="rxk-detail-page__resource-list">
                    {extraAssets.map((asset) => (
                      <div className="rxk-detail-page__resource-card" key={asset.src}>
                        <small>{asset.type === "audio" ? copy.audio : copy.document}</small>
                        <strong>{getMediaFileName(asset.src)}</strong>
                        {asset.type === "audio" ? (
                          <audio controls preload="metadata" src={toPublicAssetUrl(asset.src)} />
                        ) : (
                          <a href={toPublicAssetUrl(asset.src)} target="_blank" rel="noreferrer">
                            {copy.openFile}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="rxk-detail-page__meta-awards">
                <h2>{copy.awards}</h2>
                <p>{copy.none}</p>
              </div>
              <div className="rxk-detail-page__meta-type">
                <h2>{copy.type}</h2>
                <p>{activeProject.category}</p>
                <h2>{copy.year}</h2>
                <p>{activeProject.year}</p>
              </div>
            </div>
          </div>

          <div className="rxk-detail-page__bottom">
            <a
              href={`#/work/${previousProject.slug}`}
              aria-label={`${copy.last}: ${previousProject.title}`}
              onClick={(event) => handleDetailNavClick(event, previousProject.slug)}
            >
              {copy.last}
            </a>
            <a
              href={`#/work/${nextProject.slug}`}
              aria-label={`${copy.next}: ${nextProject.title}`}
              onClick={(event) => handleDetailNavClick(event, nextProject.slug)}
            >
              {copy.next}
            </a>
          </div>
        </aside>
      </section>
    </main>
  );

  return (
    <>
      {detailPage}
      {rapidOverlay}
    </>
  );
}

function SequenceApp({
  initialStage,
  locale,
  onLocaleToggle,
  onAboutRequest,
  onWorkDetailRequest,
  onWorksStageEntered,
  skipLoader,
  showWorksMeta,
}: {
  initialStage: "sequence" | "third";
  locale: Locale;
  onLocaleToggle: () => void;
  onAboutRequest: (payload: { label: string; sourceRect: DOMRect }) => void;
  onWorkDetailRequest: (slug: string) => void;
  onWorksStageEntered?: () => void;
  skipLoader: boolean;
  showWorksMeta: boolean;
}) {
  const loaderFrameRef = useRef<HTMLIFrameElement>(null);
  const linkedFrameRef = useRef<HTMLIFrameElement>(null);
  const transitionFrameRef = useRef<HTMLIFrameElement>(null);
  const thirdInputRef = useRef<HTMLDivElement>(null);
  const lastVisibleScreenRectRef = useRef<DOMRect | null>(null);
  const pendingThirdDeltaRef = useRef(0);
  const thirdReadyRef = useRef(false);
  const thirdRetryRef = useRef(false);
  const workDetailNavigationRef = useRef(false);
  const kineticTimersRef = useRef<number[]>([]);
  const handoffFinalizeTimerRef = useRef<number | null>(null);
  const handoffFinalizeFrameRef = useRef<number | null>(null);
  const handoffRevealHoldTimerRef = useRef<number | null>(null);
  const handoffRevealClearTimerRef = useRef<number | null>(null);
  const handoffRevealFrameRef = useRef<number | null>(null);
  const [showLoader, setShowLoader] = useState(!skipLoader);
  const [loaderFrameReady, setLoaderFrameReady] = useState(false);
  const [homeAnimationReady, setHomeAnimationReady] = useState(false);
  const [loaderReady, setLoaderReady] = useState(false);
  const [loaderStatusIndex, setLoaderStatusIndex] = useState(0);
  const [stage, setStage] = useState<"sequence" | "third">(initialStage);
  const [thirdInitialProgress, setThirdInitialProgress] = useState(0);
  const [thirdStageInstance, setThirdStageInstance] = useState<number | null>(null);
  const [thirdFrameReady, setThirdFrameReady] = useState(false);
  const [thirdInputActive, setThirdInputActive] = useState(THIRD_STAGE_INPUT_MODE === "parent");
  const [screenTransition, setScreenTransition] = useState<ScreenTransition>(emptyTransition);
  const [handoffFinalizing, setHandoffFinalizing] = useState(false);
  const [handoffRevealFading, setHandoffRevealFading] = useState(false);
  const [kineticTransition, setKineticTransition] = useState<KineticTransitionStage>("idle");
  const shouldMountThirdStage = stage === "third" || handoffFinalizing;

  useEffect(() => {
    if (stage === initialStage) return;

    pendingThirdDeltaRef.current = 0;
    if (handoffRevealHoldTimerRef.current) window.clearTimeout(handoffRevealHoldTimerRef.current);
    if (handoffRevealClearTimerRef.current) window.clearTimeout(handoffRevealClearTimerRef.current);
    if (handoffRevealFrameRef.current) window.cancelAnimationFrame(handoffRevealFrameRef.current);
    handoffRevealHoldTimerRef.current = null;
    handoffRevealClearTimerRef.current = null;
    handoffRevealFrameRef.current = null;
    setScreenTransition(emptyTransition);
    setHandoffFinalizing(false);
    setHandoffRevealFading(false);
    setThirdFrameReady(false);
    setThirdInputActive(THIRD_STAGE_INPUT_MODE === "parent");
    setThirdInitialProgress(0);
    setStage(initialStage);

    if (initialStage === "third") {
      setThirdStageInstance(null);
    } else {
      setThirdStageInstance(null);
      window.scrollTo(0, 0);
    }
  }, [initialStage, stage]);

  useEffect(() => {
    return () => {
      workDetailNavigationRef.current = false;
      kineticTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      kineticTimersRef.current = [];
      if (handoffFinalizeTimerRef.current) window.clearTimeout(handoffFinalizeTimerRef.current);
      if (handoffFinalizeFrameRef.current) window.cancelAnimationFrame(handoffFinalizeFrameRef.current);
      if (handoffRevealHoldTimerRef.current) window.clearTimeout(handoffRevealHoldTimerRef.current);
      if (handoffRevealClearTimerRef.current) window.clearTimeout(handoffRevealClearTimerRef.current);
      if (handoffRevealFrameRef.current) window.cancelAnimationFrame(handoffRevealFrameRef.current);
    };
  }, []);

  useEffect(() => {
    thirdReadyRef.current = thirdFrameReady;
  }, [thirdFrameReady]);

  useEffect(() => {
    if (stage !== "third") {
      thirdReadyRef.current = false;
      thirdRetryRef.current = false;
      return;
    }

    if (thirdReadyRef.current || thirdFrameReady) {
      thirdReadyRef.current = true;
      return;
    }

    thirdReadyRef.current = false;
    thirdRetryRef.current = false;
    setThirdFrameReady(false);

    const reloadTimer = window.setTimeout(() => {
      if (thirdReadyRef.current || thirdRetryRef.current) return;
      thirdRetryRef.current = true;
      setThirdStageInstance(Date.now());
    }, 2200);

    const releaseTimer = window.setTimeout(() => {
      if (thirdReadyRef.current) return;
      thirdReadyRef.current = true;
      setThirdFrameReady(true);

      const pendingDelta = pendingThirdDeltaRef.current;
      pendingThirdDeltaRef.current = 0;
      if (pendingDelta) {
        postToFrame(
          linkedFrameRef.current,
          {
            type: MESSAGE.loopDelta,
            deltaY: pendingDelta,
            deltaMode: 0,
          },
          getFrameTargetOrigin(),
        );
      }
    }, 4200);

    return () => {
      window.clearTimeout(reloadTimer);
      window.clearTimeout(releaseTimer);
    };
  }, [stage, locale]);

  useEffect(() => {
    if (stage !== "third") return;

    setThirdInputActive(THIRD_STAGE_INPUT_MODE === "parent");
  }, [stage, thirdFrameReady]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isFrameOrigin(event.origin)) return;

      if (event.data?.type === MESSAGE.dualWaveReady) {
        setHomeAnimationReady(true);
        return;
      }

      if (event.data?.type === MESSAGE.loopStageReady) {
        thirdReadyRef.current = true;
        setThirdFrameReady(true);

        const pendingDelta = pendingThirdDeltaRef.current;
        pendingThirdDeltaRef.current = 0;
        if (pendingDelta) {
          postToFrame(
            linkedFrameRef.current,
            {
              type: MESSAGE.loopDelta,
              deltaY: pendingDelta,
              deltaMode: 0,
            },
            getFrameTargetOrigin(),
          );
        }
      }

      if (event.data?.type === MESSAGE.openWorkDetail) {
        if (workDetailNavigationRef.current) return;
        const slug =
          typeof event.data.slug === "string" && rxkProjects.some((project) => project.slug === event.data.slug)
            ? event.data.slug
            : "";
        if (!slug) return;
        workDetailNavigationRef.current = true;
        window.removeEventListener("message", handleMessage);
        onWorkDetailRequest(slug);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [onWorkDetailRequest]);

  useEffect(() => {
    const progress = homeAnimationReady ? 1 : loaderFrameReady ? 0.58 : 0.12;

    postToFrame(
      loaderFrameRef.current,
      {
        type: homeAnimationReady ? MESSAGE.loaderComplete : MESSAGE.loaderProgress,
        progress,
        status: loaderStatusMessages[loaderStatusIndex],
      },
      getFrameTargetOrigin(),
    );
  }, [homeAnimationReady, loaderFrameReady, loaderStatusIndex]);

  useEffect(() => {
    if (homeAnimationReady && loaderFrameReady) {
      const timer = window.setTimeout(() => setLoaderReady(true), 620);

      return () => window.clearTimeout(timer);
    }
  }, [homeAnimationReady, loaderFrameReady]);

  useEffect(() => {
    if (!showLoader) return;

    if (homeAnimationReady) {
      setLoaderStatusIndex(loaderStatusMessages.length - 1);
      return;
    }

    setLoaderStatusIndex(loaderFrameReady ? 1 : 0);

    if (!loaderFrameReady) return;

    const timers = [2, 3, 4].map((nextIndex, order) =>
      window.setTimeout(() => {
        setLoaderStatusIndex((currentIndex) => Math.max(currentIndex, nextIndex));
      }, 1400 * (order + 1)),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [showLoader, loaderFrameReady, homeAnimationReady]);

  useEffect(() => {
    document.body.classList.toggle("sequence-scroll-locked", showLoader);

    return () => document.body.classList.remove("sequence-scroll-locked");
  }, [showLoader]);

  useEffect(() => {
    document.body.classList.toggle("sequence-third-active", stage === "third");

    if (stage === "third" && thirdInputActive) {
      window.requestAnimationFrame(() => thirdInputRef.current?.focus());
    }

    return () => document.body.classList.remove("sequence-third-active");
  }, [stage, thirdFrameReady, thirdInputActive]);

  useEffect(() => {
    if (stage !== "third" || !thirdInputActive) return;

    const postLoopDelta = (deltaY: number, deltaMode = 0) => {
      if (!thirdReadyRef.current) {
        pendingThirdDeltaRef.current += deltaY;
        return;
      }

      const didPost = postToFrame(
        linkedFrameRef.current,
        {
          type: MESSAGE.loopDelta,
          deltaY,
          deltaMode,
        },
        getFrameTargetOrigin(),
      );

      if (!didPost) {
        pendingThirdDeltaRef.current += deltaY;
      }
    };

    const handledWheelEvents = new WeakSet<WheelEvent>();
    const handleWheel = (event: WheelEvent) => {
      if (handledWheelEvents.has(event)) return;
      handledWheelEvents.add(event);

      event.preventDefault();
      postLoopDelta(event.deltaY, event.deltaMode);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      const keyDeltas: Record<string, number> = {
        ArrowDown: 72,
        PageDown: 360,
        " ": 360,
        ArrowUp: -72,
        PageUp: -360,
      };
      const delta = keyDeltas[event.key];

      if (!delta) return;

      event.preventDefault();
      postLoopDelta(delta, 0);
    };

    // Touch state for swipe detection AND tap detection
    const TAP_THRESHOLD_PX = 10;   // max movement to count as tap
    const TAP_THRESHOLD_MS = 300;  // max duration to count as tap
    const touchState: {
      active: boolean;
      lastY: number;
      startX: number;
      startY: number;
      startTime: number;
      moved: boolean;
    } = { active: false, lastY: 0, startX: 0, startY: 0, startTime: 0, moved: false };

    const handleTouchStart = (event: globalThis.TouchEvent) => {
      if (event.touches.length !== 1) return;
      const t = event.touches[0];
      touchState.active = true;
      touchState.lastY = t.clientY;
      touchState.startX = t.clientX;
      touchState.startY = t.clientY;
      touchState.startTime = Date.now();
      touchState.moved = false;
    };

    const handleTouchMove = (event: globalThis.TouchEvent) => {
      if (!touchState.active || event.touches.length !== 1) return;
      const nextY = event.touches[0].clientY;
      const deltaY = (touchState.lastY - nextY) * 1.35;

      if (Math.abs(deltaY) < 0.6) return;

      touchState.moved = true;
      touchState.lastY = nextY;
      event.preventDefault();
      postLoopDelta(deltaY, 0);
    };

    /** Called on touchend/touchcancel — detects taps and forwards click to iframe */
    const releaseTouch = (event?: globalThis.TouchEvent) => {
      if (!touchState.active) return;

      // Detect tap: short duration + minimal movement
      const duration = Date.now() - touchState.startTime;
      const dx = event?.changedTouches?.[0]
        ? Math.abs(event.changedTouches[0].clientX - touchState.startX)
        : 999;
      const dy = event?.changedTouches?.[0]
        ? Math.abs(event.changedTouches[0].clientY - touchState.startY)
        : 999;

      const isTap =
        !touchState.moved &&
        duration < TAP_THRESHOLD_MS &&
        Math.max(dx, dy) < TAP_THRESHOLD_PX &&
        !!event?.changedTouches?.length;

      if (isTap && event?.changedTouches?.[0]) {
        const ct = event.changedTouches[0];
        const iframe = linkedFrameRef.current;
        if (iframe) {
          try {
            const win = iframe.contentWindow as any;
            // Try dual-wave's own resolveCurrentSlug() first
            let slug: string | null = null;
            if (typeof win.resolveCurrentSlug === "function") {
              slug = win.resolveCurrentSlug();
            }
            // Fallback: read slug from DOM elements
            if (!slug) {
              const doc = iframe.contentDocument || win?.document;
              if (doc) {
                // 1. Try element at tap point or its ancestors with data-slug
                const el = doc.elementFromPoint(ct.clientX, ct.clientY);
                const thumb = el?.closest?.("[data-slug]") as HTMLElement | undefined;
                if (thumb?.dataset?.slug) {
                  slug = thumb.dataset.slug;
                } else {
                  // 2. Get the focused/active animated-text (current work)
                  const focusedText = doc.querySelector(
                    ".animated-text.focused[data-slug]"
                  ) as HTMLElement | undefined;
                  slug = focusedText?.dataset?.slug || null;
                }
                // 3. Last resort: first animated-text with data-slug
                if (!slug) {
                  const anyText = doc.querySelector(
                    ".animated-text[data-slug]"
                  ) as HTMLElement | undefined;
                  slug = anyText?.dataset?.slug || null;
                }
              }
            }
                }
              }
            }
            // Dispatch openWorkDetail to self (parent window handles navigation)
            // Use setTimeout to break out of touch event handler context,
            // otherwise React's message handler may be blocked by event batching
            if (slug) {
              setTimeout(() => {
                window.postMessage(
                  { type: MESSAGE.openWorkDetail, slug },
                  location.origin,
                );
              }, 0);
            }
          } catch (_e) {
            // cross-origin — ignore
          }
        }
      }

      touchState.active = false;
    };

    const inputLayer = thirdInputRef.current;
    const wheelOptions = { passive: false, capture: true } as AddEventListenerOptions;
    const touchOptions = { passive: false, capture: true } as AddEventListenerOptions;

    // Wheel: triple-bind (inputLayer → document → window)
    inputLayer?.addEventListener("wheel", handleWheel, wheelOptions);
    document.addEventListener("wheel", handleWheel, wheelOptions);
    window.addEventListener("wheel", handleWheel, wheelOptions);
    window.addEventListener("keydown", handleKeydown);

    // Touch: ALSO triple-bind on window/document so we capture swipes even without blocking overlay
    // (inputLayer may be pointer-events:none to let clicks pass through)
    const handledTouchEvents = new WeakSet<globalThis.TouchEvent>();
    const wrappedTouchStart = (event: globalThis.TouchEvent) => {
      if (handledTouchEvents.has(event)) return;
      handledTouchEvents.add(event);
      handleTouchStart(event);
    };
    const wrappedTouchMove = (event: globalThis.TouchEvent) => {
      if (handledTouchEvents.has(event)) return;
      handledTouchEvents.add(event);
      handleTouchMove(event);
    };

    inputLayer?.addEventListener("touchstart", wrappedTouchStart, touchOptions);
    document.addEventListener("touchstart", wrappedTouchStart, touchOptions);
    window.addEventListener("touchstart", wrappedTouchStart, touchOptions);
    inputLayer?.addEventListener("touchmove", wrappedTouchMove, touchOptions);
    document.addEventListener("touchmove", wrappedTouchMove, touchOptions);
    window.addEventListener("touchmove", wrappedTouchMove, touchOptions);
    window.addEventListener("touchend", (e) => releaseTouch(e as globalThis.TouchEvent), touchOptions);
    window.addEventListener("touchcancel", (e) => releaseTouch(e as globalThis.TouchEvent), touchOptions);
    window.requestAnimationFrame(() => inputLayer?.focus());

    return () => {
      inputLayer?.removeEventListener("wheel", handleWheel, wheelOptions);
      document.removeEventListener("wheel", handleWheel, wheelOptions);
      window.removeEventListener("wheel", handleWheel, wheelOptions);
      window.removeEventListener("keydown", handleKeydown);
      inputLayer?.removeEventListener("touchstart", wrappedTouchStart, touchOptions);
      document.removeEventListener("touchstart", wrappedTouchStart, touchOptions);
      window.removeEventListener("touchstart", wrappedTouchStart, touchOptions);
      inputLayer?.removeEventListener("touchmove", wrappedTouchMove, touchOptions);
      document.removeEventListener("touchmove", wrappedTouchMove, touchOptions);
      window.removeEventListener("touchmove", wrappedTouchMove, touchOptions);
      window.removeEventListener("touchend", releaseTouch, touchOptions);
      window.removeEventListener("touchcancel", releaseTouch, touchOptions);
    };
  }, [stage, thirdInputActive, thirdFrameReady]);

  useEffect(() => {
    if (showLoader) {
      setHandoffRevealFading(false);
      setScreenTransition(emptyTransition);
      return;
    }

    if (stage === "third" && thirdFrameReady) {
      if (!screenTransition.active) return;

      if (
        handoffRevealFading ||
        handoffRevealHoldTimerRef.current ||
        handoffRevealClearTimerRef.current
      ) {
        return;
      }

      setHandoffRevealFading(true);
      handoffRevealHoldTimerRef.current = window.setTimeout(() => {
        handoffRevealHoldTimerRef.current = null;
        handoffRevealFrameRef.current = window.requestAnimationFrame(() => {
          handoffRevealFrameRef.current = null;
          setScreenTransition((current) =>
            current.active
              ? {
                  ...current,
                  opacity: 0,
                }
              : current,
          );
        });
      }, 260);

      handoffRevealClearTimerRef.current = window.setTimeout(() => {
        handoffRevealClearTimerRef.current = null;
        setScreenTransition(emptyTransition);
        setHandoffRevealFading(false);
      }, 860);

      return;
    }

    if (stage === "third") {
      return;
    }

    if (handoffFinalizing) {
      return;
    }

    let frame = 0;

    const postLinkedProgress = (progress: number) => {
      const message = {
        type: MESSAGE.setDualWaveProgress,
        progress,
      };

      [transitionFrameRef.current, linkedFrameRef.current].forEach((frameElement) => {
        postToFrame(frameElement, message, getFrameTargetOrigin());
      });
    };

    const updateTransition = () => {
      const linkedSection = document.querySelector<HTMLElement>(".sequence__handoff-trigger");
      const screenElement = document.querySelector<HTMLElement>(".sequence__macbook-screen");

      if (!linkedSection || !screenElement) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const linkedRect = linkedSection.getBoundingClientRect();
      const screenRect = screenElement.getBoundingClientRect();
      const isScreenVisible =
        screenRect.width > 0 &&
        screenRect.height > 0 &&
        screenRect.bottom > viewportHeight * 0.08 &&
        screenRect.top < viewportHeight * 0.92;

      if (isScreenVisible) {
        lastVisibleScreenRectRef.current = new DOMRect(
          screenRect.left,
          screenRect.top,
          screenRect.width,
          screenRect.height,
        );
      }

      const rawProgress = clamp(
        (viewportHeight * 1.05 - linkedRect.top) / (viewportHeight * 1.22),
      );
      const expandProgress = clamp((rawProgress - 0.065) / 0.82);
      const linkedProgress = clamp(rawProgress * 0.985);
      const active = rawProgress > 0.025 && rawProgress < 0.985;
      const startRect = isScreenVisible ? screenRect : lastVisibleScreenRectRef.current;

      postLinkedProgress(linkedProgress);

      if (!startRect || startRect.width <= 0 || startRect.height <= 0) {
        if (!active) {
          setScreenTransition(emptyTransition);
        }
        return;
      }

      const eased = easeInOutCubic(expandProgress);
      const settleProgress = clamp((rawProgress - 0.62) / 0.30);
      const overshoot = Math.sin(settleProgress * Math.PI) * 0.01;
      const targetWidth = viewportWidth * (1 + overshoot);
      const targetHeight = viewportHeight * (1 + overshoot);
      const targetLeft = (viewportWidth - targetWidth) / 2;
      const targetTop = (viewportHeight - targetHeight) / 2;
      const left = mix(startRect.left, targetLeft, eased);
      const top = mix(startRect.top, targetTop, eased);
      const width = mix(startRect.width, targetWidth, eased);
      const height = mix(startRect.height, targetHeight, eased);
      const radius = mix(12, 0, eased);
      const opacity = clamp((rawProgress - 0.04) / 0.18);
      const contentOpacity = clamp((rawProgress - 0.2) / 0.56);
      const contentScale = mix(1.05, 1, easeOutCubic(clamp((rawProgress - 0.2) / 0.56)));
      const deviceFade = clamp((rawProgress - 0.18) / 0.64);
      const deviceOpacity = mix(1, 0.06, easeOutCubic(deviceFade));
      const deviceBlur = mix(0, 3.4, easeOutCubic(deviceFade));

      if (rawProgress >= 0.985) {
        if (handoffFinalizeTimerRef.current) {
          return;
        }

        setThirdInitialProgress(HANDOFF_RELATED_THIRD_PROGRESS);
        setThirdFrameReady(false);
        setThirdInputActive(true);
        setThirdStageInstance(null);
        setHandoffFinalizing(true);
        postLinkedProgress(HANDOFF_RELATED_THIRD_PROGRESS);
        setScreenTransition({
          active: true,
          left: px(left),
          top: px(top),
          width: px(width),
          height: px(height),
          radius: px(radius),
          opacity: Number(opacity.toFixed(3)),
          contentOpacity: Number(contentOpacity.toFixed(3)),
          contentScale: Number(contentScale.toFixed(3)),
          progress: Number(rawProgress.toFixed(3)),
          deviceOpacity: Number(deviceOpacity.toFixed(3)),
          deviceBlur: `${deviceBlur.toFixed(2)}px`,
        });

        handoffFinalizeFrameRef.current = window.requestAnimationFrame(() => {
          const targetWidth = window.innerWidth * 1.01;
          const targetHeight = window.innerHeight * 1.01;
          setScreenTransition({
            active: true,
            left: px((window.innerWidth - targetWidth) / 2),
            top: px((window.innerHeight - targetHeight) / 2),
            width: px(targetWidth),
            height: px(targetHeight),
            radius: "0px",
            opacity: 1,
            contentOpacity: 1,
            contentScale: 1,
            progress: 1,
            deviceOpacity: 0.06,
            deviceBlur: "3.4px",
          });
        });

        handoffFinalizeTimerRef.current = window.setTimeout(() => {
          pendingThirdDeltaRef.current = 0;
          setStage("third");
          onWorksStageEntered?.();
          setHandoffFinalizing(false);
          handoffFinalizeTimerRef.current = null;
          handoffFinalizeFrameRef.current = null;
        }, HANDOFF_FINALIZE_MS);
        window.scrollTo(0, 0);
        return;
      }

      if (!active) {
        setScreenTransition(emptyTransition);
        return;
      }

      setScreenTransition({
        active,
        left: px(left),
        top: px(top),
        width: px(width),
        height: px(height),
        radius: px(radius),
        opacity: Number(opacity.toFixed(3)),
        contentOpacity: Number(contentOpacity.toFixed(3)),
        contentScale: Number(contentScale.toFixed(3)),
        progress: Number(rawProgress.toFixed(3)),
        deviceOpacity: Number(deviceOpacity.toFixed(3)),
        deviceBlur: `${deviceBlur.toFixed(2)}px`,
      });
    };

    const requestTransitionUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateTransition);
    };

    updateTransition();
    window.addEventListener("scroll", requestTransitionUpdate, { passive: true });
    window.addEventListener("resize", requestTransitionUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestTransitionUpdate);
      window.removeEventListener("resize", requestTransitionUpdate);
    };
  }, [
    handoffFinalizing,
    handoffRevealFading,
    onWorksStageEntered,
    screenTransition.active,
    showLoader,
    stage,
    thirdFrameReady,
  ]);

  const enterMacbook = () => {
    if (!loaderReady || kineticTransition !== "idle") return;

    kineticTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    kineticTimersRef.current = [];
    setKineticTransition("in");

    kineticTimersRef.current.push(
      window.setTimeout(() => {
        setShowLoader(false);
        window.scrollTo(0, 0);
      }, 1080),
      window.setTimeout(() => setKineticTransition("out"), 1680),
      window.setTimeout(() => setKineticTransition("idle"), 2840),
    );
  };

  const handleThirdStageClick = (event: MouseEvent<HTMLDivElement>) => {
    // Forward click coordinates to iframe via postMessage
    postToFrame(
      linkedFrameRef.current,
      {
        type: MESSAGE.stageClick,
        clientX: event.clientX,
        clientY: event.clientY,
      },
      getFrameTargetOrigin(),
    );

    // Also dispatch click directly into iframe content (same-origin)
    const iframe = linkedFrameRef.current;
    if (!iframe) return;
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;
      const target = iframeDoc.elementFromPoint(event.clientX, event.clientY);
      if (target) {
        target.dispatchEvent(new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          clientX: event.clientX,
          clientY: event.clientY,
          view: iframe.contentWindow,
        }));
      }
    } catch (_e) {
      // Cross-origin or other error — ignore, postMessage path already tried
    }
  };

  return (
	    <main
	      className={`sequence ${stage === "third" ? "sequence--third" : ""} ${
	        screenTransition.active ? "sequence--handoff" : ""
	      } ${handoffFinalizing ? "sequence--handoff-finalizing" : ""} ${
	        handoffRevealFading ? "sequence--handoff-revealing" : ""
	      }`}
      style={
        {
          "--sequence-handoff-progress": screenTransition.progress,
          "--sequence-handoff-device-opacity": screenTransition.deviceOpacity,
          "--sequence-handoff-device-blur": screenTransition.deviceBlur,
        } as CSSProperties
      }
    >
      {!showLoader && <InfoNav locale={locale} onLocaleToggle={onLocaleToggle} />}
      {showLoader && (
        <section
          className={`sequence__loader ${loaderReady ? "sequence__loader--ready" : ""} ${
            kineticTransition !== "idle" ? "sequence__loader--transitioning" : ""
          }`}
          aria-label="loading animation"
          onClick={enterMacbook}
        >
          <iframe
            ref={loaderFrameRef}
            title="loading animation"
            src={LOADING_ANIMATION_URL}
            className="sequence__frame"
            scrolling="no"
            onLoad={() => setLoaderFrameReady(true)}
          />
        </section>
      )}

      {kineticTransition !== "idle" && (
        <section
          className={`sequence__kinetic-transition sequence__kinetic-transition--${kineticTransition}`}
          aria-hidden="true"
        >
          <div className="sequence__kinetic-type" data-type-transition>
            {kineticTransitionLines.map((line, index) => (
              <span
                className="sequence__kinetic-line"
                style={{ "--sequence-kinetic-line-index": index } as CSSProperties}
                key={`${line}-${index}`}
              >
                {line}
              </span>
            ))}
          </div>
          <div className="sequence__kinetic-lockup">
            <span>SIVAN</span>
            <strong>PORTFOLIO</strong>
          </div>
        </section>
      )}

      {stage === "sequence" && (
        <>
          <section className="sequence__macbook" aria-label="macbook scroll animation">
            <MacbookScrollDemo locale={locale} onAboutRequest={onAboutRequest} />
          </section>

          <section className="sequence__handoff-trigger" aria-hidden="true" />
        </>
      )}

      {shouldMountThirdStage && (
        <section
          className={`sequence__third-stage ${thirdFrameReady ? "sequence__third-stage--ready" : ""}`}
          aria-label="linked code animation"
        >
          <iframe
            ref={linkedFrameRef}
            title="dual wave animation"
            src={`${THIRD_STAGE_BASE_URL}&initialProgress=${thirdInitialProgress.toFixed(
              4,
            )}&locale=${locale}${thirdStageInstance ? `&v=${thirdStageInstance}` : ""}`}
            className={`sequence__third-frame ${
              !thirdInputActive && thirdFrameReady ? "sequence__third-frame--interactive" : ""
            }`}
            scrolling={thirdInputActive ? "no" : "auto"}
            tabIndex={0}
            onLoad={() => {
              if (thirdInputActive) {
                thirdInputRef.current?.focus();
              }
            }}
          />
          {!thirdFrameReady && (
            <div className="sequence__third-status" aria-live="polite">
              {locale === "zh" ? "正在同步作品索引" : "Syncing work index"}
            </div>
          )}
          {thirdInputActive && (
            <div
              ref={thirdInputRef}
              className="sequence__third-input"
              tabIndex={0}
              aria-hidden="true"
              onClick={handleThirdStageClick}
            />
          )}
          {showWorksMeta && (
            <aside className="sequence__works-meta" aria-label={locale === "zh" ? "作品档案说明" : "Work archive note"}>
              <p>{locale === "zh" ? "文字 / 图像 / 影像" : "Text / Image / Moving Image"}</p>
              <h1>{locale === "zh" ? "作品 / Opus" : "Works / Opus"}</h1>
              <span>
                {locale === "zh"
                  ? "品牌 / 宣发 / 实验 / 海报 / 体系"
                  : "Brand / Promo / Experiment / Poster / System"}
              </span>
            </aside>
          )}
        </section>
      )}

      {screenTransition.active && (
        <div
          className="sequence__screen-transition"
          aria-hidden="true"
          style={
            {
              left: screenTransition.left,
              top: screenTransition.top,
              width: screenTransition.width,
              height: screenTransition.height,
              borderRadius: screenTransition.radius,
              opacity: screenTransition.opacity,
              "--sequence-transition-content-opacity": screenTransition.contentOpacity,
              "--sequence-transition-content-scale": screenTransition.contentScale,
            } as ScreenTransitionStyle
          }
        >
          <iframe
            ref={transitionFrameRef}
            title="transition preview"
            src={`${LINKED_ANIMATION_URL}&locale=${locale}`}
            className="sequence__screen-transition-frame"
            tabIndex={-1}
            scrolling="no"
          />
        </div>
      )}
    </main>
  );
}

function App() {
  const [route, setRoute] = useState(getHashRoute);
  const [locale, setLocale] = useState<Locale>(readLocale);
  const [aboutTransitionMode, setAboutTransitionMode] = useState<AboutEntryTransitionMode>("idle");
  const [aboutHeroTransition, setAboutHeroTransition] = useState<AboutHeroTransitionState | null>(null);
  const [centerRouteTransition, setCenterRouteTransition] =
    useState<CenterRouteTransitionState | null>(null);
  const [workRapidTransition, setWorkRapidTransition] =
    useState<WorkRapidTransitionState | null>(null);
  const aboutTransitionTimersRef = useRef<number[]>([]);
  const aboutTransitionFrameRef = useRef<number | null>(null);
  const centerRouteTimersRef = useRef<number[]>([]);
  const centerRouteFrameRef = useRef<number | null>(null);
  const centerRouteActiveRef = useRef(false);
  const routeRef = useRef(route);

  const toggleLocale = () => {
    setLocale((current) => (current === "zh" ? "en" : "zh"));
  };

  const clearAboutTransition = () => {
    aboutTransitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    aboutTransitionTimersRef.current = [];
    if (aboutTransitionFrameRef.current !== null) {
      window.cancelAnimationFrame(aboutTransitionFrameRef.current);
      aboutTransitionFrameRef.current = null;
    }
    document.body.classList.remove("about-hero-transitioning");
  };

  const clearCenterRouteTransition = useCallback(() => {
    centerRouteTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    centerRouteTimersRef.current = [];
    if (centerRouteFrameRef.current !== null) {
      window.cancelAnimationFrame(centerRouteFrameRef.current);
      centerRouteFrameRef.current = null;
    }
    centerRouteActiveRef.current = false;
    setCenterRouteTransition(null);
    document.body.classList.remove("route-center-transitioning");
  }, []);

  const applyWorkDetailRoute = useCallback((slug: string) => {
    const nextRoute = `/work/${slug}`;
    const nextHash = `#${nextRoute}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
    routeRef.current = nextRoute;
    setRoute(nextRoute);
  }, []);

  const startWorkDetailTransition = useCallback(
    (slug: string) => {
      window.sessionStorage.removeItem(RXK_AUTOSTART_KEY);

      if (isMotionReduced()) {
        applyWorkDetailRoute(slug);
        return;
      }

      setWorkRapidTransition({
        slug,
        media: getRapidLayerMedia(slug, locale),
      });
    },
    [applyWorkDetailRoute, locale],
  );

  const syncWorksRoute = useCallback(() => {
    const nextRoute = "/works";
    const nextHash = `#${nextRoute}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
    routeRef.current = nextRoute;
    setRoute(nextRoute);
  }, []);

  const scheduleAboutTransition = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    aboutTransitionTimersRef.current.push(timer);
  };

  const scheduleCenterRouteTransition = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    centerRouteTimersRef.current.push(timer);
  }, []);

  const startCenterRouteTransition = useCallback(
    (targetRoute: string) => {
      const normalizedTarget = targetRoute || "/";
      if (centerRouteActiveRef.current || normalizedTarget === routeRef.current) return;

      const applyRoute = () => {
        const nextHash = `#${normalizedTarget}`;
        if (window.location.hash !== nextHash) {
          window.history.pushState(null, "", nextHash);
        }
        routeRef.current = normalizedTarget;
        setRoute(normalizedTarget);
      };

      if (isMotionReduced()) {
        applyRoute();
        return;
      }

      clearCenterRouteTransition();
      centerRouteActiveRef.current = true;
      document.body.classList.add("route-center-transitioning");
      setCenterRouteTransition({ phase: "idle", targetRoute: normalizedTarget });

      centerRouteFrameRef.current = window.requestAnimationFrame(() => {
        setCenterRouteTransition((current) =>
          current ? { ...current, phase: "covering" } : current,
        );
      });

      scheduleCenterRouteTransition(() => {
        flushSync(applyRoute);
        setCenterRouteTransition((current) =>
          current ? { ...current, phase: "revealing" } : current,
        );
      }, 760);

      scheduleCenterRouteTransition(clearCenterRouteTransition, 1760);
    },
    [clearCenterRouteTransition, scheduleCenterRouteTransition],
  );

  const startAboutTransition = ({ label, sourceRect }: { label: string; sourceRect: DOMRect }) => {
    if (aboutHeroTransition) return;

    if (isMotionReduced()) {
      window.location.hash = "#/about";
      return;
    }

    clearAboutTransition();
    document.body.classList.add("about-hero-transitioning");
    setAboutTransitionMode("visual");
    setAboutHeroTransition({
      label,
      sourceRect: captureRect(sourceRect),
      targetRect: getAboutHeroTargetRect(),
      stage: "arming",
    });

    aboutTransitionFrameRef.current = window.requestAnimationFrame(() => {
      setAboutHeroTransition((current) => (current ? { ...current, stage: "growing" } : current));
    });

    scheduleAboutTransition(() => {
      window.location.hash = "#/about";
    }, 120);
    scheduleAboutTransition(() => {
      setAboutHeroTransition((current) => (current ? { ...current, stage: "revealing" } : current));
    }, 540);
    scheduleAboutTransition(() => {
      setAboutTransitionMode("idle");
    }, 820);
    scheduleAboutTransition(() => {
      setAboutHeroTransition((current) => (current ? { ...current, stage: "settling" } : current));
    }, 1640);
    scheduleAboutTransition(() => {
      setAboutHeroTransition(null);
      clearAboutTransition();
    }, 2060);
  };

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    const updateRoute = () => {
      const nextRoute = getHashRoute();
      routeRef.current = nextRoute;
      setRoute(nextRoute);
    };
    window.addEventListener("hashchange", updateRoute);
    window.addEventListener("popstate", updateRoute);

    return () => {
      window.removeEventListener("hashchange", updateRoute);
      window.removeEventListener("popstate", updateRoute);
    };
  }, []);

  useEffect(() => {
    const handleNavigationClick = (event: globalThis.MouseEvent) => {
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

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>(".info-nav a[href^='#/']");
      if (!anchor) return;

      const hash = anchor.getAttribute("href");
      if (!hash?.startsWith("#/")) return;

      event.preventDefault();
      startCenterRouteTransition(hash.replace(/^#/, ""));
    };

    document.addEventListener("click", handleNavigationClick);

    return () => document.removeEventListener("click", handleNavigationClick);
  }, [startCenterRouteTransition]);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    prewarmAboutAssets();
  }, []);

  useEffect(() => {
    return () => {
      clearAboutTransition();
      clearCenterRouteTransition();
    };
  }, [clearCenterRouteTransition]);

  const isWorkDetailRoute = route.startsWith("/work/");
  const routeWorkSlug = isWorkDetailRoute ? getSafeDecodedSlug(route.slice(6)) : undefined;
  const routeSlugMatch =
    isWorkDetailRoute && routeWorkSlug ? routeWorkSlug.split("/")[0] : undefined;
  const visibleRoute = isWorkDetailRoute ? "/works" : route;
  let pageContent;

  if (visibleRoute === "/about" || visibleRoute === "/contact") {
    pageContent = (
      <AboutContactPages
        page={visibleRoute === "/about" ? "about" : "contact"}
        locale={locale}
        onLocaleToggle={toggleLocale}
        transitionMode={visibleRoute === "/about" ? aboutTransitionMode : "idle"}
      />
    );
  } else if (visibleRoute === "/rxk-case") {
    pageContent = <RxkCasePrototype locale={locale} onLocaleToggle={toggleLocale} />;
  } else if (isWorkDetailRoute) {
    pageContent = (
      <RxkCasePrototype
        locale={locale}
        onLocaleToggle={toggleLocale}
        workSlug={routeSlugMatch}
        onWorkDetailRequest={startWorkDetailTransition}
      />
    );
  } else {
    pageContent = (
      <SequenceApp
        key="sequence-shell"
        initialStage={visibleRoute === "/works" ? "third" : "sequence"}
        locale={locale}
        onLocaleToggle={toggleLocale}
        onAboutRequest={startAboutTransition}
        onWorkDetailRequest={startWorkDetailTransition}
        onWorksStageEntered={syncWorksRoute}
        skipLoader={visibleRoute === "/home" || visibleRoute === "/works"}
        showWorksMeta={visibleRoute === "/works"}
      />
    );
  }

  return (
    <>
      {pageContent}
      <AboutHeroTransitionOverlay transition={aboutHeroTransition} locale={locale} />
      <CenterRouteTransitionOverlay transition={centerRouteTransition} />
      {workRapidTransition && (
        <RapidLayersTransition
          media={workRapidTransition.media}
          onHalfway={() => applyWorkDetailRoute(workRapidTransition.slug)}
          onComplete={() => setWorkRapidTransition(null)}
        />
      )}
    </>
  );
}

export default App;
