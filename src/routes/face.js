const express = require("express");
const router = express.Router();
const faceRegions = require("../overrides/faceRegions.json");
const assetMappings = require("../overrides/assetMappings.json");
const specialFaces = require("../overrides/specialFaces.json");
const { fetchImageFromUrl } = require("../utils/fetchImage");
const imageService = require("../services/imageService");
const { extractFaceFromBuffer, getImageDimensions } = imageService;

// Wildcard matching helper (supports *anywhere*)
function wildcardMatch(pattern, name) {
  if (!pattern.includes("*")) return pattern === name;
  // Escape regex special chars except *
  const regex = new RegExp("^" + pattern.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(".*") + "$");
  return regex.test(name);
}

// Helper for asset mapping with wildcard support
function getAssetPath(name, assetMappings) {
  if (assetMappings[name]) return assetMappings[name];
  for (const key of Object.keys(assetMappings)) {
    if (wildcardMatch(key, name)) {
      return assetMappings[key].replace("{name}", name);
    }
  }
  return `${name}/${name}`;
}

// Helper for face region with wildcard support
function getFaceRegion(name, faceRegions, assetPath) {
  // 1. Exact match by name
  if (faceRegions[name]) return faceRegions[name];

  // 2. Asset path match (with ^ prefix and wildcard support)
  for (const key of Object.keys(faceRegions)) {
    if (key.startsWith("^")) {
      const pattern = key.slice(1);
      if (wildcardMatch(pattern, assetPath)) {
        return faceRegions[key];
      }
    }
  }

    // 3. Wildcard match by name
  for (const key of Object.keys(faceRegions)) {
    if (wildcardMatch(key, name)) {
      return faceRegions[key];
    }
  }

  return null;
}

// Helper for special face handlers with wildcard support
function getSpecialFaceHandler(name, specialFaces) {
  if (specialFaces[name]) return specialFaces[name];
  for (const key of Object.keys(specialFaces)) {
    if (wildcardMatch(key, name)) {
      return specialFaces[key];
    }
  }
  return null;
}

// Endpoint to get a mob face texture
router.get("/:name", async (req, res) => {
  const name = req.params.name.toLowerCase();
  const outWidth = parseInt(req.query.width || "64");

  // Get asset path with wildcard support
  const assetPath = getAssetPath(name, assetMappings);

  // URLs to try for fetching the mob texture
  const urlsToTry = [
    `https://assets.mcasset.cloud/latest/assets/minecraft/textures/entity/${assetPath}.png`,
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

  // If no image was found, return a 404 error
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

  // Get face region with wildcard support
  let region = getFaceRegion(name, faceRegions, assetPath);
  if (!region) {
    if (width === 64 && height === 64) {
      region = { x: 8, y: 8, width: 8, height: 8 };
    } else if (width === 32 && height === 32) {
      region = { x: 5, y: 5, width: 5, height: 5 };
    } else {
      region = { x: 8, y: 8, width: 8, height: 8 }; // Fallback default
    }
  }

  // Special handling for certain faces (with wildcard support)
  const specialHandler = getSpecialFaceHandler(name, specialFaces);
  if (specialHandler) {
    try {
      const fn = imageService[specialHandler];
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

  // Generic face extraction
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
