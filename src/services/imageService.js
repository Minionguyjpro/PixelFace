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

async function extractCatFaceWithSnout(buffer, outWidth) {
  // Face and snout regions (adjust if needed)
  const faceRegion = { left: 5, top: 5, width: 5, height: 4 };
  const snoutRegion = { left: 2, top: 26, width: 3, height: 2 };

  // Calculate output height to preserve aspect ratio
  const aspect = faceRegion.height / faceRegion.width;
  const outHeight = Math.round(outWidth * aspect);

  // Calculate scale factors for X and Y
  const scaleX = outWidth / faceRegion.width;
  const scaleY = outHeight / faceRegion.height;

  // Extract and scale face
  const face = await sharp(buffer)
    .extract(faceRegion)
    .resize(outWidth, outHeight, { kernel: "nearest" })
    .png()
    .toBuffer();

  // Extract and scale snout
  const snout = await sharp(buffer)
    .extract(snoutRegion)
    .resize(
      Math.round(snoutRegion.width * scaleX),
      Math.round(snoutRegion.height * scaleY),
      { kernel: "nearest" }
    )
    .png()
    .toBuffer();

  // Center snout horizontally, place at bottom of face, then move down by 0.5
  const snoutLeft = Math.round((faceRegion.width / 2 - snoutRegion.width / 2) * scaleX);
  const snoutTop = Math.round((faceRegion.height - snoutRegion.height) * scaleY); // or + 0.25 if needed
  // Composite snout onto face
  const composed = await sharp(face)
    .composite([
      { input: snout, left: snoutLeft, top: snoutTop }
    ])
    .png()
    .toBuffer();

  return composed;
}

async function extractWolfFaceWithSnout(buffer, outWidth) {
  // Define regions
  const faceRegion = { left: 4, top: 4, width: 6, height: 6 };
  const snoutRegion = { left: 4, top: 14, width: 3, height: 3 };

  // Calculate output height to preserve aspect ratio (if you want to keep it square, use outWidth for both)
  const aspect = faceRegion.height / faceRegion.width;
  const outHeight = Math.round(outWidth * aspect);

  // Calculate scale factors for X and Y
  const scaleX = outWidth / faceRegion.width;
  const scaleY = outHeight / faceRegion.height;

  // Extract and scale face
  const face = await sharp(buffer)
    .extract(faceRegion)
    .resize(outWidth, outHeight, { kernel: "nearest" })
    .png()
    .toBuffer();

  // Extract and scale snout
  const snout = await sharp(buffer)
    .extract(snoutRegion)
    .resize(
      Math.round(snoutRegion.width * scaleX),
      Math.round(snoutRegion.height * scaleY),
      { kernel: "nearest" }
    )
    .png()
    .toBuffer();

  // Center snout horizontally, place at bottom of face
  const snoutLeft = Math.round((faceRegion.width / 2 - snoutRegion.width / 2) * scaleX);
  const snoutTop = Math.round((faceRegion.height - snoutRegion.height) * scaleY);

  // Composite snout onto face
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
  extractCatFaceWithSnout,
  extractWolfFaceWithSnout,
};
