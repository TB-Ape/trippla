import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, "../public/icon.svg");
const svg = readFileSync(svgPath);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

await Promise.all(
  sizes.map((size) =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(__dirname, `../public/icons/icon-${size}x${size}.png`))
      .then(() => console.log(`✓ icon-${size}x${size}.png`))
  )
);

console.log("Icons generated!");
