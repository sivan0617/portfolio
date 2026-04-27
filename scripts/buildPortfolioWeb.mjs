import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cwdRepoRoot = process.cwd();
const resolvedRepoRoot = fs.existsSync(path.join(cwdRepoRoot, "public", "portfolio"))
  ? cwdRepoRoot
  : repoRoot;

const sourceRoot = path.join(resolvedRepoRoot, "public", "portfolio");
const webRoot = path.join(resolvedRepoRoot, "public", "portfolio-web");
const manifestPath = path.join(webRoot, "manifest.json");

const cwebpPath = "/opt/local/bin/cwebp";
const sipsPath = "/usr/bin/sips";
const maxEdge = Number(process.argv[2]) || 2800;
const quality = Number(process.argv[3]) || 82;

const imageExts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp", ".tif", ".tiff"]);

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const toPosix = (value) => value.split(path.sep).join("/");

const isImageExt = (filePath) => imageExts.has(path.extname(filePath).toLowerCase());

const listFiles = (dir, out = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, out);
      continue;
    }
    out.push(fullPath);
  }

  return out;
};

const hasAlpha = (filePath) => {
  try {
    const output = execFileSync(sipsPath, ["-g", "hasAlpha", filePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return /yes/i.test(output);
  } catch {
    return false;
  }
};

const getDimensions = (filePath) => {
  const out = execFileSync(
    sipsPath,
    ["-g", "pixelWidth", "-g", "pixelHeight", filePath],
    { encoding: "utf8" },
  );
  const widthMatch = out.match(/pixelWidth:\s*(\d+)/i);
  const heightMatch = out.match(/pixelHeight:\s*(\d+)/i);
  if (!widthMatch || !heightMatch) return null;
  return {
    width: Number(widthMatch[1]),
    height: Number(heightMatch[1]),
  };
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-web-"));
const cleanupTemp = () => fs.rmSync(tempDir, { recursive: true, force: true });
process.on("exit", cleanupTemp);
process.on("SIGINT", () => {
  cleanupTemp();
  process.exit();
});

const prepareInput = (sourcePath) => {
  const dims = getDimensions(sourcePath);
  if (!dims) return null;
  const longest = Math.max(dims.width, dims.height);
  if (longest <= maxEdge) {
    return sourcePath;
  }

  const outputPath = path.join(
    tempDir,
    `${path.basename(sourcePath)}-${Math.max(dims.width, dims.height)}-${Date.now()}.png`,
  );
  execFileSync(sipsPath, ["-Z", `${maxEdge}`, sourcePath, "--out", outputPath]);
  return outputPath;
};

const cwebpSupportsAlpha = (() => {
  try {
    const help = execFileSync(cwebpPath, ["-longhelp"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return /-alpha_q/i.test(help);
  } catch {
    return true;
  }
})();

const convertToWebp = (inputPath, outputPath, useAlpha) => {
  const qualityArg = [`-q`, `${quality}`];
  const alphaArg = useAlpha ? ["-alpha_q", "90"] : ["-noalpha"];
  execFileSync(
    cwebpPath,
    ["-quiet", ...qualityArg, ...alphaArg, inputPath, "-o", outputPath],
    {
      stdio: "ignore",
    },
  );
};

const getTargetPath = (sourcePath) => {
  const rel = path.relative(sourceRoot, sourcePath);
  const parsed = path.parse(rel);
  return path.join(webRoot, parsed.dir, `${parsed.base}.webp`);
};

const buildEntry = (sourcePath, webPath, originalBytes, webBytes) => {
  return {
    originalPath: `/${toPosix(path.relative(path.join(resolvedRepoRoot, "public"), sourcePath))}`,
    webPath: `/${toPosix(path.relative(path.join(resolvedRepoRoot, "public"), webPath))}`,
    originalSize: originalBytes,
    newSize: webBytes,
  };
};

const main = () => {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`source folder not found: ${sourceRoot}`);
  }

  ensureDir(webRoot);

  const allFiles = listFiles(sourceRoot);
  const entries = [];
  let processed = 0;
  let skipped = 0;
  let totalOriginal = 0;
  let totalWeb = 0;

  for (const sourcePath of allFiles) {
    if (!isImageExt(sourcePath)) {
      skipped += 1;
      continue;
    }

    const target = getTargetPath(sourcePath);
    ensureDir(path.dirname(target));

    const originalBytes = fs.statSync(sourcePath).size;
    const isTransparentPng =
      path.extname(sourcePath).toLowerCase() === ".png" && hasAlpha(sourcePath);

    if (isTransparentPng && !cwebpSupportsAlpha) {
      skipped += 1;
      continue;
    }

    try {
      const resizedInput = prepareInput(sourcePath);
      convertToWebp(resizedInput ?? sourcePath, target, isTransparentPng);
      const webBytes = fs.statSync(target).size;

      entries.push(buildEntry(sourcePath, target, originalBytes, webBytes));
      processed += 1;
      totalOriginal += originalBytes;
      totalWeb += webBytes;
    } catch (error) {
      skipped += 1;
      continue;
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2), "utf8");

  const summary = {
    processed,
    skipped,
    totalOriginalBytes: totalOriginal,
    totalWebBytes: totalWeb,
    savedBytes: totalOriginal - totalWeb,
  };
  console.log(JSON.stringify(summary, null, 2));
};

main();
