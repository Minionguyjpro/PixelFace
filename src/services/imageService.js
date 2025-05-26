const sharp = require("sharp");

// Extract a face from an image buffer
async function extractFaceFromBuffer(buffer, outWidth, region = { x: 8, y: 8, width: 8, height: 8 }) {
  // Calculate scale factor
  const scale = outWidth / region.width;
  return await sharp(buffer)
    .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
    .resize(Math.round(region.width * scale), Math.round(region.height * scale), { kernel: "nearest" })
    .png()
    .toBuffer();
}

// Retrieve the dimensions of an image from a buffer using sharp
async function getImageDimensions(buffer) {
  const metadata = await sharp(buffer).metadata();
  return { width: metadata.width, height: metadata.height };
}

async function extractWolfFaceWithSnout(buffer, outWidth) {
  // 1. Define regions
  const faceRegion = { left: 4, top: 4, width: 6, height: 6 };
  const snoutRegion = { left: 4, top: 14, width: 3, height: 3 };

  // 2. Calculate scale factor
  const scale = outWidth / faceRegion.width;

  // 3. Extract and scale face
  const face = await sharp(buffer)
    .extract(faceRegion)
    .resize(outWidth, outWidth, { kernel: "nearest" })
    .png()
    .toBuffer();

  // 4. Extract and scale snout
  const snout = await sharp(buffer)
    .extract(snoutRegion)
    .resize(Math.round(snoutRegion.width * scale), Math.round(snoutRegion.height * scale), { kernel: "nearest" })
    .png()
    .toBuffer();

  // 5. Calculate snout position on scaled face
  const snoutLeft = Math.round(1.5 * scale); // (face width - snout width) / 2 = (6-3)/2 = 1.5, use 1 for center
  const snoutTop = Math.round(3 * scale);  // Place at bottom half: 6-3=3

  // 6. Composite snout onto face
  const composed = await sharp(face)
    .composite([
      { input: snout, left: snoutLeft, top: snoutTop }
    ])
    .png()
    .toBuffer();

  return composed;
}

module.exports = {
  extractFaceFromBuffer,
  getImageDimensions,
  extractWolfFaceWithSnout,
};
