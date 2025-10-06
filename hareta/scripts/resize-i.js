import sharp from 'sharp';
import fs from 'fs';

const input = 'img/hero.jpg'; // high-res source
const outputDir = 'public/images'; // Vite serves from /images

const sizes = [480, 800, 1200, 1600];
const formats = [
  { ext: 'avif', options: { quality: 45 } },
  { ext: 'webp', options: { quality: 70 } },
  { ext: 'jpg', options: { quality: 70, progressive: true } },
];

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  for (const width of sizes) {
    for (const { ext, options } of formats) {
      const outPath = `${outputDir}/hero-${width}.${ext}`;
      await sharp(input)
        .resize({ width })
        .toFormat(ext, options)
        .toFile(outPath);
      console.log(`✅ Generated ${outPath}`);
    }
  }
})();
