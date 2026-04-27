import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = "/Users/a001/Documents/工作树/升级优化类/个人进化类/animation-sequence-123";
const sourceRoot = "/Users/a001/Desktop/sivan作品集";
const portfolioRoot = path.join(repoRoot, "public/portfolio");
const assetLibraryPath = path.join(repoRoot, "src/data/projectAssetLibrary.ts");

const imageExts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);
const videoExts = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const audioExts = new Set([".mp3", ".wav", ".aif", ".aiff", ".m4a", ".aac"]);
const documentExts = new Set([".html", ".htm", ".txt", ".md", ".pdf", ".doc", ".docx"]);

const copyPlan = [
  {
    slug: "kuang-brand",
    targets: [
      {
        source: "品牌设计：礦-kuang/礦-饰品宣发片",
        dest: "kuang/礦-饰品宣发片",
      },
      {
        source: "品牌设计：礦-kuang/礦品牌设计",
        dest: "kuang/礦品牌设计",
      },
    ],
  },
  {
    slug: "mthayas-film",
    targets: [{ source: "藏x水晶服饰宣发片", dest: "mthayas" }],
  },
  {
    slug: "redtail-intercept",
    targets: [
      { source: "赤尾大广赛", dest: "redtail", recursive: false },
      { source: "赤尾大广赛/参考图", dest: "redtail/参考图" },
    ],
  },
  {
    slug: "poster-pixel-exhibition",
    targets: [{ source: "海报/像素展览", dest: "posters/像素展览" }],
  },
  {
    slug: "poster-other-series",
    targets: [{ source: "海报/其他", dest: "posters/其他" }],
  },
  {
    slug: "poster-organ-show",
    targets: [{ source: "海报/器官展", dest: "posters/器官展" }],
  },
  {
    slug: "poster-experimental-series",
    targets: [{ source: "海报/实验海报", dest: "posters/实验海报" }],
  },
  {
    slug: "poster-fresh",
    targets: [{ source: "海报/清鲜", dest: "posters/清鲜" }],
  },
  {
    slug: "poster-art-hand",
    targets: [{ source: "海报/艺术手法", dest: "posters/艺术手法" }],
  },
  {
    slug: "poster-solar",
    targets: [{ source: "海报/节气", dest: "posters/节气" }],
  },
  {
    slug: "poster-misc",
    targets: [{ source: "海报/零散", dest: "posters/零散" }],
  },
  {
    slug: "comic-series",
    targets: [{ source: "漫画", dest: "comics" }],
  },
  {
    slug: "experimental-dimensional",
    targets: [{ source: "实验性短片作品/次元壁", dest: "experimental/次元壁" }],
    coverFrom: "experimental/次元壁",
  },
  {
    slug: "experimental-fantasy",
    targets: [{ source: "实验性短片作品/异世界", dest: "experimental/异世界" }],
    coverFrom: "experimental/异世界",
  },
  {
    slug: "experimental-mood",
    targets: [{ source: "实验性短片作品/情绪", dest: "experimental/情绪" }],
    coverFrom: "experimental/情绪",
  },
  {
    slug: "experimental-misc",
    targets: [{ source: "实验性短片作品/杂", dest: "experimental/杂" }],
    coverFrom: "experimental/杂",
  },
];

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const toPosixPath = (value) => value.split(path.sep).join("/");

const listFiles = (dir, recursive = true) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) files.push(...listFiles(fullPath, true));
      continue;
    }
    files.push(fullPath);
  }

  return files.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
};

const copyFiles = (fromDir, toDir, recursive = true) => {
  ensureDir(toDir);
  const files = listFiles(fromDir, recursive);

  for (const sourceFile of files) {
    const relativePath = path.relative(fromDir, sourceFile);
    const destFile = path.join(toDir, relativePath);
    ensureDir(path.dirname(destFile));
    fs.copyFileSync(sourceFile, destFile);
  }
};

const buildQuickLookPoster = (sourceFile, posterPath) => {
  const tempDir = fs.mkdtempSync(path.join(fs.realpathSync("/tmp"), "portfolio-poster-"));
  try {
    execFileSync("/usr/bin/qlmanage", ["-t", "-s", "1600", "-o", tempDir, sourceFile], {
      stdio: "ignore",
    });
    const generatedFile = path.join(tempDir, `${path.basename(sourceFile)}.png`);
    if (!fs.existsSync(generatedFile)) return null;
    fs.copyFileSync(generatedFile, posterPath);
    return posterPath;
  } catch {
    return null;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const firstRenderableMedia = (dir) => {
  const files = listFiles(dir, false);
  return files.find((file) => {
    const ext = path.extname(file).toLowerCase();
    return imageExts.has(ext) || videoExts.has(ext);
  });
};

const buildQuickLookCover = (dir) => {
  const sourceFile = firstRenderableMedia(dir);
  if (!sourceFile) return null;

  const coverPath = path.join(dir, "cover.png");
  return buildQuickLookPoster(sourceFile, coverPath);
};

const classifyBundle = (destDirs) => {
  const bundle = { image: [], video: [], audio: [], document: [] };
  const seen = new Set();

  for (const destDir of destDirs) {
    for (const file of listFiles(destDir, true)) {
      if (seen.has(file)) continue;
      seen.add(file);
      const ext = path.extname(file).toLowerCase();
      const publicPath = `/${toPosixPath(path.relative(path.join(repoRoot, "public"), file))}`;
      if (imageExts.has(ext)) bundle.image.push(publicPath);
      else if (videoExts.has(ext)) bundle.video.push(publicPath);
      else if (audioExts.has(ext)) bundle.audio.push(publicPath);
      else if (documentExts.has(ext)) bundle.document.push(publicPath);
    }
  }

  return bundle;
};

const serializeBundle = (bundle) => {
  const lines = [];
  lines.push("export type ProjectAssetBundle = {");
  lines.push("  image: string[];");
  lines.push("  video: string[];");
  lines.push("  audio?: string[];");
  lines.push("  document?: string[];");
  lines.push("};");
  lines.push("");
  lines.push("export const PROJECT_ASSET_LIBRARY: Record<string, ProjectAssetBundle> = {");

  for (const item of copyPlan) {
    const entry = bundle[item.slug];
    lines.push(`  ${JSON.stringify(item.slug)}: {`);
    lines.push(`    image: ${JSON.stringify(entry.image, null, 2).replace(/\n/g, "\n    ")},`);
    lines.push(`    video: ${JSON.stringify(entry.video, null, 2).replace(/\n/g, "\n    ")},`);
    if (entry.audio.length) {
      lines.push(`    audio: ${JSON.stringify(entry.audio, null, 2).replace(/\n/g, "\n    ")},`);
    }
    if (entry.document.length) {
      lines.push(`    document: ${JSON.stringify(entry.document, null, 2).replace(/\n/g, "\n    ")},`);
    }
    lines.push("  },");
  }

  lines.push("};");
  lines.push("");
  return `${lines.join("\n")}`;
};

fs.rmSync(portfolioRoot, { recursive: true, force: true });
ensureDir(portfolioRoot);

for (const item of copyPlan) {
  for (const target of item.targets) {
    const sourceDir = path.join(sourceRoot, target.source);
    const destDir = path.join(portfolioRoot, target.dest);
    copyFiles(sourceDir, destDir, target.recursive !== false);
  }
}

for (const item of copyPlan) {
  for (const target of item.targets) {
    const destDir = path.join(portfolioRoot, target.dest);
    for (const file of listFiles(destDir, true)) {
      const ext = path.extname(file).toLowerCase();
      if (!videoExts.has(ext)) continue;
      buildQuickLookPoster(file, `${file}.png`);
    }
  }
}

for (const item of copyPlan) {
  if (!item.coverFrom) continue;
  buildQuickLookCover(path.join(portfolioRoot, item.coverFrom));
}

const bundles = {};
for (const item of copyPlan) {
  const destDirs = item.targets.map((target) => path.join(portfolioRoot, target.dest));
  bundles[item.slug] = classifyBundle(destDirs);
}

fs.writeFileSync(assetLibraryPath, serializeBundle(bundles), "utf8");

const summary = copyPlan.map((item) => {
  const bundle = bundles[item.slug];
  return {
    slug: item.slug,
    image: bundle.image.length,
    video: bundle.video.length,
    audio: bundle.audio.length,
    document: bundle.document.length,
  };
});

console.log(JSON.stringify(summary, null, 2));
