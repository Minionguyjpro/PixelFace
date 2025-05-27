const sharp = require("sharp");

async function extractFaceFromBuffer(buffer, outWidth, region = { x: 8, y: 8, width: 8, height: 8 }) {
  const scale = outWidth / region.width;
  return await sharp(buffer)
    .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
    .resize(Math.round(region.width * scale), Math.round(region.height * scale), { kernel: "nearest" })
    .png()
    .toBuffer();
}

async function getImageDimensions(buffer) {
  const metadata = await sharp(buffer).metadata();
  return { width: metadata.width, height: metadata.height };
}

async function extractFaceWithSnout(buffer, outWidth, faceRegion, snoutRegion) {
  // Use the same scale for both face and snout
  const scale = outWidth / faceRegion.width;
  const outHeight = Math.round(faceRegion.height * scale);

  // Extract and scale face
  const face = await sharp(buffer)
    .extract({ left: faceRegion.x, top: faceRegion.y, width: faceRegion.width, height: faceRegion.height })
    .resize(outWidth, outHeight, { kernel: "nearest" })
    .png()
    .toBuffer();

  // Extract and scale snout using the same scale
  const snoutWidth = Math.round(snoutRegion.width * scale);
  const snoutHeight = Math.round(snoutRegion.height * scale);
  const snout = await sharp(buffer)
    .extract({ left: snoutRegion.x, top: snoutRegion.y, width: snoutRegion.width, height: snoutRegion.height })
    .resize(snoutWidth, snoutHeight, { kernel: "nearest" })
    .png()
    .toBuffer();

  // Center snout horizontally, place at bottom of face
  const snoutLeft = Math.round((outWidth - snoutWidth) / 2);
  const snoutTop = outHeight - snoutHeight;

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
  extractFaceWithSnout,
  getImageDimensions,
};