const sharp = require("sharp");

function getClosestValidWidth(target, faceWidth) {
  const lower = Math.floor(target / faceWidth) * faceWidth;
  const upper = Math.ceil(target / faceWidth) * faceWidth;
  return (target - lower <= upper - target) ? lower : upper;
}

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

async function extractFaceWithBackground(buffer, outWidth, faceRegion, backgroundRegion) {
  // Gather all regions (background + face)
  const regions = Array.isArray(backgroundRegion)
    ? [...backgroundRegion, faceRegion]
    : [backgroundRegion, faceRegion];

  // Find bounding box
  const minX = Math.min(...regions.map(r => r.x));
  const minY = Math.min(...regions.map(r => r.y));
  const maxX = Math.max(...regions.map(r => r.x + r.width));
  const maxY = Math.max(...regions.map(r => r.y + r.height));

  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;

  // Scale based on face region width
  const scale = outWidth / faceRegion.width;

  // Output canvas size is always outWidth x outWidth (square)
  const canvasWidth = outWidth;
  const canvasHeight = outWidth;

  // Center the bounding box in the output canvas
  const offsetX = Math.round((canvasWidth - Math.round(bboxWidth * scale)) / 2);
  const offsetY = Math.round((canvasHeight - Math.round(bboxHeight * scale)) / 2);

  // Create blank canvas
  let base = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  let composites = [];

  // Composite all background layers
  if (Array.isArray(backgroundRegion)) {
    for (const region of backgroundRegion) {
      const layer = await sharp(buffer)
        .extract({
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height
        })
        .resize(
          Math.round(region.width * scale),
          Math.round(region.height * scale),
          { kernel: "nearest" }
        )
        .png()
        .toBuffer();
      const offsetLeft = offsetX + Math.round((region.x - minX) * scale);
      const offsetTop = offsetY + Math.round((region.y - minY) * scale);
      composites.push({ input: layer, left: offsetLeft, top: offsetTop });
    }
  } else if (backgroundRegion) {
    const region = backgroundRegion;
    const layer = await sharp(buffer)
      .extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height
      })
      .resize(
        Math.round(region.width * scale),
        Math.round(region.height * scale),
        { kernel: "nearest" }
      )
      .png()
      .toBuffer();
    const offsetLeft = offsetX + Math.round((region.x - minX) * scale);
    const offsetTop = offsetY + Math.round((region.y - minY) * scale);
    composites.push({ input: layer, left: offsetLeft, top: offsetTop });
  }

  // Face layer
  const face = await sharp(buffer)
    .extract({
      left: faceRegion.x,
      top: faceRegion.y,
      width: faceRegion.width,
      height: faceRegion.height
    })
    .resize(
      Math.round(faceRegion.width * scale),
      Math.round(faceRegion.height * scale),
      { kernel: "nearest" }
    )
    .png()
    .toBuffer();

  const faceLeft = offsetX + Math.round((faceRegion.x - minX) * scale);
  const faceTop = offsetY + Math.round((faceRegion.y - minY) * scale);

  composites.push({ input: face, left: faceLeft, top: faceTop });

  // Composite all layers
  let composed = await sharp(base)
    .composite(composites)
    .png()
    .toBuffer();

  return composed;
}

async function extractFaceWithSnout(buffer, outWidth, faceRegion, snoutRegion) {
  // Always use the closest valid width for pixel-perfect results
  if (outWidth % faceRegion.width !== 0) {
    outWidth = getClosestValidWidth(outWidth, faceRegion.width);
  }
  const scale = outWidth / faceRegion.width;
  const outHeight = Math.round(faceRegion.height * scale);

  // Extract and scale face
  const face = await sharp(buffer)
    .extract({ left: faceRegion.x, top: faceRegion.y, width: faceRegion.width, height: faceRegion.height })
    .resize(outWidth, outHeight, { kernel: "nearest" })
    .png()
    .toBuffer();

  // Extract and scale snout using the same scale
  const snoutWidth = snoutRegion.width * scale;
  const snoutHeight = snoutRegion.height * scale;

  const snout = await sharp(buffer)
    .extract({ left: snoutRegion.x, top: snoutRegion.y, width: snoutRegion.width, height: snoutRegion.height })
    .resize(snoutWidth, snoutHeight, { kernel: "nearest" })
    .png()
    .toBuffer();

  // Center snout horizontally, place at bottom of face
  const snoutLeft = (outWidth - snoutWidth) / 2;
  const snoutTop = outHeight - snoutHeight;

  // Composite snout onto face
  const composed = await sharp(face)
    .composite([
      { input: snout, left: Math.round(snoutLeft), top: Math.round(snoutTop) }
    ])
    .png()
    .toBuffer();

  return composed;
}

module.exports = {
  extractFaceFromBuffer,
  extractFaceWithBackground,
  extractFaceWithSnout,
  getImageDimensions,
};