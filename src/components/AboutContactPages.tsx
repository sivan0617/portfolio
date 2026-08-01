import { useEffect, useRef, useState } from "react";
import { portfolioIntro } from "@/portfolioContent";
import { toPublicAssetUrl } from "@/lib/utils";

export type Locale = "zh" | "en";

type AboutContactPagesProps = {
  page: "about" | "contact";
  locale: Locale;
  onLocaleToggle: () => void;
  transitionMode?: "idle" | "visual";
};

type NavProps = {
  locale: Locale;
  onLocaleToggle: () => void;
};

const SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._/";

const copy = {
  zh: {
    nav: {
      home: "首页",
      work: "作品",
      about: "关于",
      contact: "联系",
      toggle: "EN",
    },
    about: {
      eyebrow: "关于 / 索引",
      title: "关于",
      role: portfolioIntro.role,
      philosophy: [
        portfolioIntro.about,
      ],
      strengths: [
        ["擅长", "品牌定位梳理 / 广告创意提案 / 脚本策划 / 分镜与关键帧设计 / 人物及产品视觉开发"],
        ["核心能力", "商业拍摄执行 / AI 图像与视频制作 / 人物与产品一致性控制 / 后期把控与成片交付"],
        ["创作优势", "将模糊需求整理为清晰、统一、可延展且能够落地的品牌影像体系"],
      ],
      disciplines: "方向",
      focus: "近期关注",
      disciplinesItems: portfolioIntro.disciplines,
      focusItems: portfolioIntro.focus,
      resume: [
        ["姓名", "姚茜文 / Sivan"],
        ["身份", "AIGC 视觉设计师 / 品牌视觉设计师 / 图像方向 / 视觉系统 / 概念影像"],
        ["工作轨迹", "江西 / 成都 / 重庆 / 上海"],
        ["领域", "品牌视觉系统 / 短片概念 / UI 系统 / 商业影像 / AIGC 视觉实验"],
        ["主导项目 01", "素元氏｜功效护肤品牌宣传：品牌调性、创意提案、脚本分镜、人物与产品视觉、动态影像全流程统筹"],
        ["主导项目 02", "如水无争｜克东天然苏打水：品牌视觉方向、TVC、产品与人物广告、信息流短视频及成片交付"],
        ["参与经历", "重庆两江公交宣传动画 / 永川影视基地艺术家宣传 / 问界汽车宣传片等多个项目"],
      ],
    },
    contact: {
      title: "有项目 联系我",
      email: "邮箱",
      wechat: "微信",
      designed: "设计与开发",
      designer: "Sivan",
      copyright: "© 2026，保留所有权利",
      socials: "社交媒体",
    },
  },
  en: {
    nav: {
      home: "Home",
      work: "Work",
      about: "About",
      contact: "Contact",
      toggle: "中",
    },
    about: {
      eyebrow: "ABOUT / INDEX",
      title: "About",
      role: "AIGC Visual Designer / Brand Visual Designer / Commercial Image-maker",
      philosophy: [
        "I am drawn to emotional images and clear visual systems. Images, motion, typography, and interfaces are not separate materials to me; together they become a language that can be remembered and extended. My practice now moves from brand visuals into commercial and AI filmmaking, spanning concepts, scripts, storyboards, visual development, production, and final delivery.",
      ],
      strengths: [
        ["Specialties", "Brand Positioning / Advertising Concepts / Scripts / Storyboards & Keyframes / Character & Product Visual Development"],
        ["Core Skills", "Commercial Production / AI Image & Video / Character & Product Consistency / Post-production & Final Delivery"],
        ["Strength", "Turning ambiguous needs into clear, cohesive, extensible, and production-ready brand film systems"],
      ],
      disciplines: "Fields",
      focus: "Current Focus",
      disciplinesItems: ["Brand Visual Systems", "Short-Film Concepts", "UI Visual Design", "Commercial & AI Filmmaking"],
      focusItems: ["Digital & Forward-Looking Expression", "Advertising & Film Collaborations", "Brand Visuals & Content"],
      resume: [
        ["Name", "Yaoxiwen / Sivan"],
        ["Role", "AIGC Visual Designer / Brand Visual Designer / Image Direction / Visual Systems / Concept Moving Image"],
        ["Work Trace", "Jiangxi / Chengdu / Chongqing / Shanghai"],
        ["Fields", "Brand Visual Systems / Short-Film Concepts / UI Systems / Commercial Film / AIGC Visual Experiments"],
        ["Lead Project 01", "Suyuanshi Skincare: brand tone, concepts, scripts, storyboards, character and product visuals, and moving-image production"],
        ["Lead Project 02", "RUSHUIWUZHENG Soda Water: brand direction, TVC, product and character advertising, short-form content, and final delivery"],
        ["Project Experience", "Chongqing Liangjiang Bus Animation / Yongchuan Film Base Artist Campaign / AITO Promotional Film, among other projects"],
      ],
    },
    contact: {
      title: "GET IN TOUCH",
      email: "Email",
      wechat: "WeChat",
      designed: "Designed & Developed By",
      designer: "Sivan",
      copyright: "© 2026, All Rights Reserved",
      socials: "Socials",
    },
  },
} as const;

type AboutStageWindow = typeof window & {
  APP?: {
    Stage?: unknown;
    Layout?: unknown;
  };
  __sequenceAboutWarnGuard?: boolean;
  __sequenceAboutStageCtor?: new () => unknown;
  __sequenceAboutLayoutCtor?: new () => unknown;
};

const ABOUT_SCRIPT_ID = "about-gooey-script";

const isTouchMobileAbout = () => window.matchMedia("(max-width: 900px)").matches;

const normalizeAboutLayout = (app: NonNullable<AboutStageWindow["APP"]>) => {
  if (typeof app.Layout === "object" && app.Layout !== null) {
    (app.Layout as { isMobile?: boolean }).isMobile = isTouchMobileAbout();
  }
};

const prepareAboutLayoutGuard = () => {
  const aboutWindow = window as AboutStageWindow;
  const app = aboutWindow.APP ?? (aboutWindow.APP = {});
  app.Layout ??= { isMobile: isTouchMobileAbout() };
  normalizeAboutLayout(app);
  return app;
};

const disposeAboutStage = () => {
  const aboutWindow = window as AboutStageWindow;
  const stage = aboutWindow.APP?.Stage as
    | {
        constructor?: new () => unknown;
        Scroll?: { destroy?: () => void };
        scene?: {
          renderer?: {
            dispose?: () => void;
            forceContextLoss?: () => void;
          };
        };
      }
    | undefined;
  const layout = aboutWindow.APP?.Layout as { constructor?: new () => unknown } | undefined;

  if (stage?.constructor) {
    aboutWindow.__sequenceAboutStageCtor = stage.constructor;
  }
  if (layout?.constructor) {
    aboutWindow.__sequenceAboutLayoutCtor = layout.constructor;
  }

  try {
    stage?.Scroll?.destroy?.();
  } catch {
    // The bundled Codrops script has no public cleanup API; best-effort disposal is enough here.
  }

  try {
    stage?.scene?.renderer?.dispose?.();
    stage?.scene?.renderer?.forceContextLoss?.();
  } catch {
    // Ignore renderer disposal failures from stale WebGL contexts.
  }

  if (aboutWindow.APP) {
    delete aboutWindow.APP.Stage;
    delete aboutWindow.APP.Layout;
  }
};

const isCurrentAboutStage = () => {
  const aboutWindow = window as AboutStageWindow;
  const scene = document.getElementById("scene");
  const stage = aboutWindow.APP?.Stage as { $els?: { scene?: HTMLElement | null } } | undefined;

  return Boolean(scene && stage?.$els?.scene === scene && scene.isConnected);
};

export function AboutContactPages({
  page,
  locale,
  onLocaleToggle,
  transitionMode = "idle",
}: AboutContactPagesProps) {
  return (
    <main className={`info-page info-page--${page}`} data-transition={page === "about" ? transitionMode : "idle"}>
      <InfoNav locale={locale} onLocaleToggle={onLocaleToggle} />
      {page === "about" ? <AboutPage locale={locale} /> : <ContactPage locale={locale} />}
    </main>
  );
}

export function InfoNav({ locale, onLocaleToggle }: NavProps) {
  const nav = copy[locale].nav;

  return (
    <nav className="info-nav" aria-label="site navigation">
      <a href="#/home" className="info-nav__brand">
        SIVAN
      </a>
      <div className="info-nav__links">
        <a href="#/home">{nav.home}</a>
        <a href="#/works">{nav.work}</a>
        <a href="#/about">{nav.about}</a>
        <a href="#/contact">{nav.contact}</a>
        <button
          type="button"
          className="info-nav__locale-switch"
          data-locale={locale}
          aria-label={locale === "zh" ? "Switch to English" : "切换到中文"}
          onClick={onLocaleToggle}
        >
          <span className="info-nav__locale-option info-nav__locale-option--zh">中</span>
          <span className="info-nav__locale-option info-nav__locale-option--en">EN</span>
        </button>
      </div>
    </nav>
  );
}

function AboutPage({ locale }: { locale: Locale }) {
  const about = copy[locale].about;
  const [animationFailed, setAnimationFailed] = useState(false);
  const [mobileAboutFallback, setMobileAboutFallback] = useState(() =>
    typeof window !== "undefined" ? isTouchMobileAbout() : false,
  );
  const [isImageTouched, setIsImageTouched] = useState(false);

  // Mobile: touch the visual window → toggle between portrait and code-hover image
  // Mimics desktop hover experience where touching shows the code-hover state
  const handleVisualTouchStart = () => {
    if (!mobileAboutFallback) return;
    setIsImageTouched(true);
  };
  const handleVisualTouchEnd = () => {
    if (!mobileAboutFallback) return;
    setIsImageTouched(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const widthQuery = window.matchMedia("(max-width: 900px)");
    const syncMobileAbout = () => setMobileAboutFallback(isTouchMobileAbout());

    syncMobileAbout();
    widthQuery.addEventListener("change", syncMobileAbout);

    return () => {
      widthQuery.removeEventListener("change", syncMobileAbout);
    };
  }, []);

  useEffect(() => {
    const guardedWindow = window as AboutStageWindow;
    setAnimationFailed(false);

    if (mobileAboutFallback) {
      setAnimationFailed(true);
      disposeAboutStage();
      document.getElementById(ABOUT_SCRIPT_ID)?.remove();
      return;
    }

    if (!guardedWindow.__sequenceAboutWarnGuard) {
      const originalWarn = console.warn.bind(console);
      console.warn = (...args: unknown[]) => {
        if (
          typeof args[0] === "string" &&
          args[0].includes("THREE.Matrix3: .getInverse() can't invert matrix")
        ) {
          return;
        }

        originalWarn(...args);
      };
      guardedWindow.__sequenceAboutWarnGuard = true;
    }

    let cancelled = false;
    let frame = 0;

    const markAnimationFailed = () => {
      if (cancelled) return;
      setAnimationFailed(true);
      document.getElementById(ABOUT_SCRIPT_ID)?.remove();
      disposeAboutStage();
    };

    const handleAboutScriptError = (event: ErrorEvent) => {
      const filename = event.filename || "";
      const message = event.message || "";
      if (
        filename.includes("/about-gooey/app.js") ||
        message.includes("WebGLRenderer") ||
        message.includes("Error creating WebGL context")
      ) {
        markAnimationFailed();
      }
    };

    const mountStage = () => {
      if (cancelled || isCurrentAboutStage()) return;

      disposeAboutStage();

      if (guardedWindow.__sequenceAboutStageCtor && guardedWindow.__sequenceAboutLayoutCtor) {
        try {
          const app = prepareAboutLayoutGuard();
          app.Stage = new guardedWindow.__sequenceAboutStageCtor();
          app.Layout = new guardedWindow.__sequenceAboutLayoutCtor();
          normalizeAboutLayout(app);
        } catch {
          markAnimationFailed();
        }
        return;
      }

      document.getElementById(ABOUT_SCRIPT_ID)?.remove();
      prepareAboutLayoutGuard();

      const script = document.createElement("script");
      script.id = ABOUT_SCRIPT_ID;
      script.src = toPublicAssetUrl("/about-gooey/app.js");
      script.async = true;
      script.addEventListener("error", markAnimationFailed);
      script.addEventListener("load", () => {
        window.requestAnimationFrame(() => {
          if (cancelled || isCurrentAboutStage()) return;

          disposeAboutStage();
          if (guardedWindow.__sequenceAboutStageCtor && guardedWindow.__sequenceAboutLayoutCtor) {
            try {
              const app = prepareAboutLayoutGuard();
              app.Stage = new guardedWindow.__sequenceAboutStageCtor();
              app.Layout = new guardedWindow.__sequenceAboutLayoutCtor();
              normalizeAboutLayout(app);
            } catch {
              markAnimationFailed();
            }
          }
        });
      });
      document.body.appendChild(script);
    };

    window.addEventListener("error", handleAboutScriptError, true);
    frame = window.requestAnimationFrame(mountStage);

    return () => {
      cancelled = true;
      window.removeEventListener("error", handleAboutScriptError, true);
      window.cancelAnimationFrame(frame);
      document.getElementById(ABOUT_SCRIPT_ID)?.remove();
      disposeAboutStage();
    };
  }, [mobileAboutFallback]);

  const aboutPageClassName = [
    "info-page__section",
    "info-page__section--about",
    "about-index",
    animationFailed ? "about-index--animation-failed" : "",
    mobileAboutFallback ? "about-index--mobile-fallback" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={aboutPageClassName}>
      <div
        className={`about-index__visual-window info-page__about-visual about-gooey${mobileAboutFallback && isImageTouched ? " about-index__visual-window--touched" : ""}`}
        aria-label="profile visual"
        onTouchStart={handleVisualTouchStart}
        onTouchEnd={handleVisualTouchEnd}
        onTouchCancel={handleVisualTouchEnd}
      >
        <section className="about-gooey__content scrollarea-ctn">
          <div className="about-gooey__scrollarea scrollarea slideshow">
            <ul className="about-gooey__list slideshow-list">
              <li className="about-gooey__item slideshow-list__el">
                <article className="about-gooey__tile tile js-tile">
                  <a href="#/about" aria-label="profile visual animation">
                    <figure className="about-gooey__figure tile__fig">
                      <img
                        src={toPublicAssetUrl(
                          mobileAboutFallback && isImageTouched
                            ? "/about-gooey/img/tiles/woods/code-hover.png"
                            : "/about-gooey/img/tiles/woods/portrait.png",
                        )}
                        data-hover={toPublicAssetUrl("/about-gooey/img/tiles/woods/code-hover.png")}
                        alt=""
                        className={`about-gooey__image tile__img${mobileAboutFallback && isImageTouched ? " is-loaded" : ""}`}
                      />
                    </figure>
                  </a>
                </article>
              </li>
            </ul>
          </div>
        </section>
        <canvas id="scene" className="about-gooey__scene" />
      </div>

      <aside className="about-index__copy" aria-label={about.title}>
        <p className="about-index__eyebrow">
          <ScrambleText as="span" text={about.eyebrow} />
        </p>
        {about.philosophy.map((paragraph) => (
          <p className="about-index__paragraph" key={paragraph}>
            <ScrambleText as="span" text={paragraph} />
          </p>
        ))}
        <dl className="about-index__strengths">
          {about.strengths.map(([label, value]) => (
            <div className="about-index__strengths-item" key={label}>
              <dt>
                <ScrambleText as="span" text={label} />
              </dt>
              <dd>
                <ScrambleText as="span" text={value} />
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      <aside className="about-index__side-notes" aria-label={locale === "zh" ? "关于补充信息" : "About details"}>
        <dl className="about-index__resume">
          {about.resume.map(([label, value]) => (
            <div className="about-index__resume-item" key={label}>
              <dt>
                <ScrambleText as="span" text={label} />
              </dt>
              <dd>
                <ScrambleText as="span" text={value} />
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      <footer className="about-index__bottom">
        <p>
          <ScrambleText text={locale === "zh" ? "四川农业大学 / 视觉传达设计" : "Sichuan Agricultural University / Visual Communication Design"} />
        </p>
        <p>
          <ScrambleText text={locale === "zh" ? "视觉创意 / 商业影像 / 品牌叙事" : "Visual Creativity / Commercial Film / Brand Storytelling"} />
        </p>
        <a href={`mailto:${portfolioIntro.contact.email}`}>
          <ScrambleText text={locale === "zh" ? "发送邮件" : "Send An Email"} />
        </a>
      </footer>
    </section>
  );
}

function ContactPage({ locale }: { locale: Locale }) {
  const contact = copy[locale].contact;
  const socialItems = ["Instagram", "WeChat", "X", "TikTok", "bilibili"];
  const [contactMode, setContactMode] = useState<"email" | "wechat">("email");
  const activeContact =
    contactMode === "email"
      ? { label: contact.email, value: portfolioIntro.contact.email }
      : { label: contact.wechat, value: portfolioIntro.contact.wechat };

  return (
    <section className="info-page__section info-page__section--contact contact-index">
      <div className="contact-index__panel">
        <div className="contact-index__title-track" aria-hidden="true">
          <h1 className="contact-index__title">
            <span>{contact.title}</span>
            <span>{contact.title}</span>
            <span>{contact.title}</span>
            <span>{contact.title}</span>
          </h1>
          <h1 className="contact-index__title">
            <span>{contact.title}</span>
            <span>{contact.title}</span>
            <span>{contact.title}</span>
            <span>{contact.title}</span>
          </h1>
        </div>

        <a
          className="contact-index__email-box"
          href={`mailto:${portfolioIntro.contact.email}`}
          onBlur={() => setContactMode("email")}
          onFocus={() => setContactMode("wechat")}
          onMouseEnter={() => setContactMode("wechat")}
          onMouseLeave={() => setContactMode("email")}
        >
          <ScrambleText text={activeContact.label} />
          <ScrambleText as="strong" text={activeContact.value} />
        </a>

        <footer className="contact-index__footer">
          <div className="contact-index__footer-group contact-index__footer-group--left">
            <p>{contact.designed}</p>
            <ScrambleText as="strong" text={contact.designer} />
          </div>

          <div className="contact-index__footer-group contact-index__footer-group--center">
            <p>{contact.socials}</p>
            <ul>
              {socialItems.map((item) => (
                <li key={item}>
                  <ScrambleText text={item} />
                </li>
              ))}
            </ul>
          </div>

          <div className="contact-index__footer-group contact-index__footer-group--right">
            <ScrambleText as="strong" text={contact.copyright} />
          </div>
        </footer>
      </div>
    </section>
  );
}

function ScrambleText({
  as = "span",
  text,
  className,
  trigger = 0,
  runOnHover = true,
}: {
  as?: "span" | "strong";
  text: string;
  className?: string;
  trigger?: number;
  runOnHover?: boolean;
}) {
  const [display, setDisplay] = useState(text);
  const timerRef = useRef<number | null>(null);

  const scrambleTo = (target: string) => {
    if (timerRef.current) window.clearInterval(timerRef.current);

    let frame = 0;
    timerRef.current = window.setInterval(() => {
      frame += 1;
      setDisplay(
        target
          .split("")
          .map((char, index) => {
            if (char === " " || char === "@" || char === "." || char === "/") return char;
            if (index < frame / 1.45) return char;
            return SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
          })
          .join(""),
      );

      if (frame > target.length * 1.45) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setDisplay(target);
      }
    }, 28);
  };

  useEffect(() => {
    scrambleTo(text);
  }, [text, trigger]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const run = () => {
    if (!runOnHover) return;
    scrambleTo(text);
  };

  const Tag = as;

    return (
    <Tag
      className={className ?? "contact-index__scramble"}
      onBlur={() => setDisplay(text)}
      onFocus={run}
      onMouseEnter={run}
      onMouseLeave={() => setDisplay(text)}
      tabIndex={0}
    >
      {display}
    </Tag>
  );
}
