import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import supabase from "@config/supabase";

const SIZES = [400, 800, 1200];
const FORMATS = [
  { ext: "avif", options: { quality: 45 } },
  { ext: "jpg", options: { quality: 70, progressive: true } },
];

/**
 * Generate multiple image variants + LQIP, upload to Supabase,
 * and return all public URLs.
 */
export async function uploadImageVariants(file: Express.Multer.File) {
  const id = uuidv4();
  const folder = `menu-items/${id}`;

  const image = sharp(file.buffer);

  // Generate the LQIP (≈40 px wide JPEG)
  const lqipBuffer = await image
    .clone()
    .resize({ width: 40 })
    .jpeg({ quality: 30 })
    .toBuffer();

  const lqipPath = `${folder}/lqip.jpg`;
  await supabase.storage.from("airi").upload(lqipPath, lqipBuffer, {
    contentType: "image/jpeg",
  });

  const { data: lqipData } = supabase.storage
    .from("airi")
    .getPublicUrl(lqipPath);
  const lqipUrl = lqipData.publicUrl;

  //Generate main variants
  const variants: Record<string, Record<number, string>> = {};

  for (const { ext, options } of FORMATS) {
    variants[ext] = {};
    for (const width of SIZES) {
      const buffer = await image
        .clone()
        .resize({ width })
        .toFormat(ext as keyof sharp.FormatEnum, options)
        .toBuffer();

      const path = `${folder}/${width}.${ext}`;
      await supabase.storage.from("airi").upload(path, buffer, {
        contentType: `image/${ext}`,
      });

      const { data } = supabase.storage.from("airi").getPublicUrl(path);
      variants[ext][width] = data.publicUrl;
    }
  }

  return {
    id,
    lqip: lqipUrl,
    variants,
  };
}
// Delete all variants in a folder (by id)
export async function deleteImageVariantS(imageData: any) {
  try {
    if (!imageData?.id) return;
    const folder = `menu-items/${imageData.id}`;
    // Supabase doesn’t support recursive delete, so list and remove
    const { data: files } = await supabase.storage.from("airi").list(folder);
    if (files?.length) {
      const paths = files.map((f) => `${folder}/${f.name}`);
      await supabase.storage.from("airi").remove(paths);
    }
  } catch (error) {
    console.error("Error deleting image variants:", error);
  }
}
