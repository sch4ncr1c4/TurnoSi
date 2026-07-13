import sharp from "sharp";

type ImagePreset = "logo" | "galleryHorizontal" | "galleryVertical";

const presets: Record<
  ImagePreset,
  { width: number; height: number; maxBytes: number; minWidth: number; quality: number }
> = {
  logo: { width: 512, height: 512, maxBytes: 60 * 1024, minWidth: 180, quality: 82 },
  galleryHorizontal: {
    width: 1600,
    height: 1000,
    maxBytes: 220 * 1024,
    minWidth: 900,
    quality: 78
  },
  galleryVertical: {
    width: 900,
    height: 1125,
    maxBytes: 190 * 1024,
    minWidth: 620,
    quality: 78
  }
};

export async function optimizeImage(input: Buffer, preset: ImagePreset) {
  const config = presets[preset];
  const image = sharp(input, { limitInputPixels: 24_000_000 }).rotate();
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Invalid image");
  }

  let width = Math.min(config.width, metadata.width);
  let height = Math.min(config.height, metadata.height);
  let quality = config.quality;
  let data = await renderOptimized(input, preset, width, height, quality);

  while (data.length > config.maxBytes && quality > 48) {
    quality -= 6;
    data = await renderOptimized(input, preset, width, height, quality);
  }

  while (data.length > config.maxBytes && width > config.minWidth) {
    width = Math.max(config.minWidth, Math.round(width * 0.86));
    height = Math.round(height * 0.86);
    quality = Math.max(46, quality - 4);
    data = await renderOptimized(input, preset, width, height, quality);
  }

  return {
    contentType: "image/webp",
    data: Uint8Array.from(data)
  };
}

async function renderOptimized(
  input: Buffer,
  preset: ImagePreset,
  width: number,
  height: number,
  quality: number
) {
  return sharp(input, { limitInputPixels: 24_000_000 })
    .rotate()
    .resize({
      width,
      height,
      fit: preset === "logo" ? "inside" : "cover",
      withoutEnlargement: true
    })
    .webp({
      quality,
      effort: 6,
      smartSubsample: true
    })
    .toBuffer();
}
