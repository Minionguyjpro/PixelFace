const express = require("express");
const router = express.Router();
const { getOverrides } = require("../services/reloadService");
const { fetchImageFromUrl } = require("../utils/fetchImage");
const imageService = require("../services/imageService");
const { extractFaceFromBuffer, extractFaceWithSnout, getImageDimensions } = imageService;

// Wildcard matching helper (supports *anywhere*)
function wildcardMatch(pattern, name) {
  if (!pattern.includes("*")) return pattern === name;
  // Escape regex special chars except *
  const regex = new RegExp("^" + pattern.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(".*") + "$");
  return regex.test(name);
}

// Helper for asset mapping with wildcard support
function getAssetPath(name, assetMappings) {
  if (assetMappings[name]) return assetMappings[name].replace("{name}", name);
  for (const key of Object.keys(assetMappings)) {
    if (wildcardMatch(key, name)) {
      return assetMappings[key].replace("{name}", name);
    }
  }
  return `${name}/${name}`;
}

// Helper for face region with wildcard support
function getFaceRegion(name, faceRegions, assetPath) {
  if (faceRegions[name]) return faceRegions[name];
  for (const key of Object.keys(faceRegions)) {
    if (key.startsWith("^")) {
      const pattern = key.slice(1);
      if (wildcardMatch(pattern, assetPath)) {
        return faceRegions[key];
      }
    }
  }
  for (const key of Object.keys(faceRegions)) {
    if (wildcardMatch(key, name)) {
      return faceRegions[key];
    }
  }
  return null;
}

// Helper for snout region with wildcard and asset path support
function getSnoutRegion(name, snoutRegions, assetPath) {
  if (snoutRegions[name]) return snoutRegions[name];
  for (const key of Object.keys(snoutRegions)) {
    if (key.startsWith("^")) {
      const pattern = key.slice(1);
      if (wildcardMatch(pattern, assetPath)) {
        return snoutRegions[key];
      }
    }
  }
  for (const key of Object.keys(snoutRegions)) {
    if (wildcardMatch(key, name)) {
      return snoutRegions[key];
    }
  }
  return null;
}

// Endpoint to get a mob face texture
router.get("/:name", async (req, res) => {
  const name = req.params.name.toLowerCase();
  const outWidth = parseInt(req.query.width || "64");

  // Get asset path and regions with wildcard support
  const { faceRegions, assetMappings, snoutRegions } = getOverrides();
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
    } else if (width === 128 && height === 64) {
      region = { x: 7, y: 7, width: 7, height: 7 };
    } else if (width === 32 && height === 32) {
      region = { x: 5, y: 5, width: 5, height: 5 };
    } else {
      region = { x: 8, y: 8, width: 8, height: 8 }; // Fallback default
    }
  }

  // General snout logic: if a snout region exists, use it
  const snoutRegion = getSnoutRegion(name, snoutRegions, assetPath);
  if (snoutRegion) {
    try {
      const cropped = await extractFaceWithSnout(imageBuffer, outWidth, region, snoutRegion);
      res.set("Content-Type", "image/png");
      return res.send(cropped);
    } catch (err) {
      console.error(`${name} face+snout processing error:`, err.message);
      return res.status(500).send(`Failed to process ${name} face+snout.`);
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