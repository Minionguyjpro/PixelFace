const sharp = require("sharp");

async function extractFaceFromBuffer(buffer, scale = 8, region = { x: 8, y: 8, width: 8, height: 8 }) {
  return await sharp(buffer)
    .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
    .resize(region.width * scale, region.height * scale, { kernel: "nearest" })
    .png()
    .toBuffer();
}

module.exports = {
  extractFaceFromBuffer
};
