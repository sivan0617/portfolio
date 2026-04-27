import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distAssetsDir = path.join(repoRoot, "dist", "assets");

if (fs.existsSync(distAssetsDir)) {
  for (const entry of fs.readdirSync(distAssetsDir)) {
    if (!entry.endsWith(".css")) continue;
    const filePath = path.join(distAssetsDir, entry);
    const css = fs.readFileSync(filePath, "utf8");
    const nextCss = css
      .replace(/url\("\/fonts\//g, 'url("../fonts/')
      .replace(/url\('\/fonts\//g, "url('../fonts/")
      .replace(/url\(\/fonts\//g, "url(../fonts/");
    if (nextCss !== css) {
      fs.writeFileSync(filePath, nextCss, "utf8");
    }
  }
}
