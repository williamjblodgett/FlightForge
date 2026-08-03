import sharp from "sharp";

const [backgroundPath, logoPath, outputPath] = process.argv.slice(2);
if (!backgroundPath || !logoPath || !outputPath) {
  throw new Error("Usage: node scripts/build-social-preview.mjs <background> <logo> <output>");
}

const width = 1734;
const height = 907;
const logo = await sharp(logoPath).resize(116, 116, { fit: "contain" }).png().toBuffer();
const overlay = Buffer.from(`
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="88" y="110" width="6" height="600" fill="#ff7417"/>
    <text x="238" y="181" fill="#fffdf5" font-family="Georgia, serif" font-size="64" font-weight="700" letter-spacing="-2">FlightForge</text>
    <text x="104" y="350" fill="#fffdf5" font-family="Georgia, serif" font-size="106" font-weight="700" letter-spacing="-5">Know before</text>
    <text x="104" y="454" fill="#ff7417" font-family="Georgia, serif" font-size="106" font-style="italic" font-weight="700" letter-spacing="-5">you throw.</text>
    <text x="106" y="541" fill="#dce4e8" font-family="Arial, sans-serif" font-size="30" font-weight="600">120 source-checked Maine course listings</text>
    <text x="106" y="589" fill="#aabac5" font-family="Arial, sans-serif" font-size="24">Find a line. Save a course. Build your game.</text>
    <rect x="104" y="648" width="312" height="55" rx="3" fill="#ff7417"/>
    <text x="132" y="684" fill="#071f39" font-family="Arial, sans-serif" font-size="21" font-weight="800" letter-spacing="2">MAINE FIELD INDEX</text>
  </svg>
`);

await sharp(backgroundPath)
  .resize(width, height, { fit: "cover" })
  .composite([{ input: overlay, top: 0, left: 0 }, { input: logo, top: 122, left: 104 }])
  .png({ compressionLevel: 9 })
  .toFile(outputPath);
