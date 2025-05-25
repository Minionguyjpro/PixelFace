const express = require("express");
const router = express.Router();
const faceRegions = require("../overrides/faceRegions");
const { fetchImageFromUrl } = require("../utils/fetchImage");
const { extractFaceFromBuffer } = require("../services/imageService");

router.get("/:name", async (req, res) => {
  const name = req.params.name.toLowerCase();
  const scale = parseInt(req.query.scale || "8");

  const urlsToTry = [
    `https://assets.mcasset.cloud/latest/assets/minecraft/textures/entity/${name}/${name}.png`,
    `https://assets.mcasset.cloud/latest/assets/minecraft/textures/entity/${name}.png`,
  ];

  let imageBuffer = null;

  for (const url of urlsToTry) {
    try {
      imageBuffer = await fetchImageFromUrl(url);
      break;
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(`Error fetching ${url}:`, err.message);
        return res.status(500).send("Failed fetching image.");
      }
    }
  }

  if (!imageBuffer) {
    return res.status(404).send("Texture not found for that mob.");
  }

  const region = faceRegions[name] || { x: 8, y: 8, width: 8, height: 8 };

  try {
    const cropped = await extractFaceFromBuffer(imageBuffer, scale, region);
    res.set("Content-Type", "image/png");
    res.send(cropped);
  } catch (err) {
    console.error("Image processing error:", err.message);
    res.status(500).send("Failed to process image.");
  }
});

module.exports = router;
