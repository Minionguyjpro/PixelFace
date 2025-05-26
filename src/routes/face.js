const express = require("express");
const router = express.Router();
const faceRegions = require("../overrides/faceRegions.json");
const { fetchImageFromUrl } = require("../utils/fetchImage");
const { extractFaceFromBuffer, getImageDimensions } = require("../services/imageService");

// Endpoint to get a mob face texture
// Example usage: GET /faces/zombie
// - `name`: The name of the mob (e.g., "zombie", "skeleton")
router.get("/:name", async (req, res) => {
  const name = req.params.name.toLowerCase();
  const outWidth = parseInt(req.query.width || "64");

  // Put URLs to try for fetching the mob texture
  const urlsToTry = [
    `https://assets.mcasset.cloud/latest/assets/minecraft/textures/entity/${name}/${name}.png`,
    `https://assets.mcasset.cloud/latest/assets/minecraft/textures/entity/${name}.png`,
  ];

  let imageBuffer = null;

  // Try fetching the image from the provided URLs
  // If one fails, it will try the next one
  // If all fail, it will return a 404 error
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

  // If no image was fetched, return a 404 error
  if (!imageBuffer) {
    return res.status(404).send("Texture not found for that mob.");
  }

  // Get image dimensions
  let width, height;
  try {
    const dims = await getImageDimensions(imageBuffer);
    width = dims.width;
    height = dims.height;
  } catch (err) {
    console.error("Failed to read image metadata:", err.message);
    return res.status(500).send("Failed to process image.");
  }

  // Determine region
  let region = faceRegions[name];
  if (!region) {
    if (width === 64 && height === 64) {
      region = { x: 8, y: 8, width: 8, height: 8 };
    } else if (width === 32 && height === 32) {
      region = { x: 5, y: 5, width: 5, height: 5 };
    } else {
      region = { x: 8, y: 8, width: 8, height: 8 }; // Fallback default
    }
  }

const specialFaces = require("../overrides/specialFaces.json");
const imageService = require("../services/imageService");

  // Special handling for certain faces
  if (specialFaces[name]) {
    try {
      const fn = imageService[specialFaces[name]];
      if (typeof fn === "function") {
        const cropped = await fn(imageBuffer, outWidth);
        res.set("Content-Type", "image/png");
        return res.send(cropped);
      }
    } catch (err) {
      console.error(`${name} face processing error:`, err.message);
      return res.status(500).send(`Failed to process ${name} face.`);
    }
  }

  // Crop the face region from the image buffer
  try {
    const cropped = await extractFaceFromBuffer(imageBuffer, outWidth, region);
    res.set("Content-Type", "image/png");
    res.send(cropped);
  } catch (err) {
    console.error("Image processing error:", err.message);
    res.status(500).send("Failed to process image.");
  }
});

module.exports = router;
