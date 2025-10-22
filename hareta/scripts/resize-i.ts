import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

type ImageFormat = 'avif' | 'jpg' | 'jpeg';
interface Format {
  ext: ImageFormat;
  options?: sharp.JpegOptions | sharp.AvifOptions;
}

interface ImageMeta {
  width: number;
  formats: { ext: string; file: string }[];
}

/**
 * Generate responsive product images with optional square crop
 */
async function generateProductImages(
  inputPath: string,
  outputDir: string,
  baseName: string,
  sizes: number[] = [150, 300, 600, 1200],
  formats: Format[] = [
    { ext: 'avif', options: { quality: 45 } },
    { ext: 'jpg', options: { quality: 70, progressive: true } },
  ],
  cropSquare: boolean = false,
) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const metadata: ImageMeta[] = [];

  for (const width of sizes) {
    const height = cropSquare ? width : undefined; // square crop if needed

    const formatsMeta: { ext: string; file: string }[] = [];

    for (const { ext, options } of formats) {
      const outFileName = `${baseName}-${width}.${ext}`;
      const outPath = path.join(outputDir, outFileName);

      let pipeline = sharp(inputPath).resize({ width, height });

      if (cropSquare) {
        pipeline = pipeline.resize(width, width, { fit: 'cover' });
      } else {
        pipeline = pipeline.resize({ width });
      }

      await pipeline
        .toFormat(ext as keyof sharp.FormatEnum, options)
        .toFile(outPath);

      formatsMeta.push({ ext, file: outFileName });
      console.log(`✅ Generated ${outPath}`);
    }

    metadata.push({ width, formats: formatsMeta });
  }

  // write JSON metadata file
  const metaFile = path.join(outputDir, `${baseName}-meta.json`);
  fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
  console.log(`📄 Metadata saved to ${metaFile}`);
}

// Example usage: multiple products
(async () => {
  const images = [
    { input: 'img/product1.jpg', name: 'product1' },
    { input: 'img/product2.jpg', name: 'product2' },
  ];

  const outputDir = 'public/images';

  for (const img of images) {
    // cropSquare = true for card thumbnails
    await generateProductImages(
      img.input,
      outputDir,
      img.name,
      undefined,
      undefined,
      true,
    );
  }

  console.log('🎉 All product images + metadata generated!');
})();
