import sharp from "sharp";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  throw new Error("Usage: node scripts/process-logo.mjs <input.png> <output.png>");
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let index = 0; index < data.length; index += 4) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  // The source contains no intentional green. Removing every green-dominant
  // pixel also clears the dark anti-aliased fringe left by chroma removal.
  if (green > red + 3 && green > blue + 3) {
    data[index + 3] = 0;
  }
}

await sharp(data, { raw: info })
  .trim({ background: { r: 0, g: 255, b: 0, alpha: 0 } })
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9, palette: true })
  .toFile(output);
