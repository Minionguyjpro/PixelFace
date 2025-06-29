const express = require("express");
const router = express.Router();
const { getOverrides } = require("../services/reloadService");
const { fetchImageFromUrl } = require("../utils/fetchImage");
const imageService = require("../services/imageService");
const { extractFaceFromBuffer, extractFaceWithSnout, extractFaceWithBackground, getImageDimensions } = imageService;

// Wildcard matching helper (supports *anywhere*)
function wildcardMatch(pattern, name) {
  if (!pattern.includes("*")) return pattern === name;
  // Escape regex special chars except *
  const regex = new RegExp("^" + pattern.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(".*") + "$");
  return regex.test(name);
}

// Helper for asset mapping with wildcard support
function getAssetPath(name, assetMappings) {
  if (Object.prototype.hasOwnProperty.call(assetMappings, name)) {
    return assetMappings[name];
  }
  for (const key of Object.keys(assetMappings)) {
    if (wildcardMatch(key, name)) {
      return assetMappings[key];
    }
  }
  return `${name}/${name}`;
}

// Helper to get the closest valid width for face extraction
function getClosestValidWidth(target, faceWidth) {
  const lower = Math.floor(target / faceWidth) * faceWidth;
  const upper = Math.ceil(target / faceWidth) * faceWidth;
  // Pick the closest one to target
  return (target - lower <= upper - target) ? lower : upper;
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

// Helper for background region with wildcard and asset path support
function getBackgroundRegion(name, backgroundRegions, assetPath) {
  if (backgroundRegions && backgroundRegions[name]) return backgroundRegions[name];
  if (!backgroundRegions) return null;
  for (const key of Object.keys(backgroundRegions)) {
    if (key.startsWith("^")) {
      const pattern = key.slice(1);
      if (wildcardMatch(pattern, assetPath)) {
        return backgroundRegions[key];
      }
    }
  }
  for (const key of Object.keys(backgroundRegions)) {
    if (wildcardMatch(key, name)) {
      return backgroundRegions[key];
    }
  }
  return null;
}

// Endpoint to get a mob face texture
router.get("/:name", async (req, res) => {
  const name = req.params.name.toLowerCase();

  // Get asset path and regions with wildcard support
  const { faceRegions, assetMappings, snoutRegions, backgroundRegions } = getOverrides();
  const assetPath = getAssetPath(name, assetMappings);

  // If the asset mapping is explicitly null, return 404
  if (assetPath === null) {
    return res.status(404).send("Texture not found for that mob.");
  }

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

  // Determine output width
  let outWidth = req.query.width ? parseInt(req.query.width, 10) : 64;

  // Check for background region (for slimes, etc.)
  const backgroundRegion = getBackgroundRegion(name, backgroundRegions, assetPath);
  if (backgroundRegion) {
    // Validate all regions
    const regions = Array.isArray(backgroundRegion) ? backgroundRegion : [backgroundRegion];
    for (const r of regions) {
      if (
        typeof r.x !== "number" ||
        typeof r.y !== "number" ||
        typeof r.width !== "number" ||
        typeof r.height !== "number"
      ) {
        return res.status(500).send("Invalid background region definition.");
      }
    }
    if (outWidth % region.width !== 0) {
      outWidth = getClosestValidWidth(outWidth, region.width);
    }
    try {
      const cropped = await extractFaceWithBackground(imageBuffer, outWidth, region, backgroundRegion);
      res.set("Content-Type", "image/png");
      if (req.query.width && parseInt(req.query.width, 10) !== outWidth) {
        res.set("X-Actual-Width", outWidth.toString());
      }
      return res.send(cropped);
    } catch (err) {
      console.error(`${name} face+background processing error:`, err.message);
      return res.status(500).send(`Failed to process ${name} face+background.`);
    }
  }

  // General snout logic: if a snout region exists, use it
  const snoutRegionEntry = getSnoutRegion(name, snoutRegions, assetPath);
  if (snoutRegionEntry) {
    if (outWidth % region.width !== 0) {
      outWidth = getClosestValidWidth(outWidth, region.width);
    }

    // Support all valid snout region formats and apply offset if present
    let snoutRegion, snoutOffset;
    if (Array.isArray(snoutRegionEntry.region)) {
      // New format with offset
      const [x, y, width, height] = snoutRegionEntry.region;
      snoutRegion = { x, y, width, height };
      snoutOffset = snoutRegionEntry.offset || { x: 0, y: 0 };
    } else if (snoutRegionEntry.region && typeof snoutRegionEntry.region === "object") {
      snoutRegion = snoutRegionEntry.region;
      snoutOffset = snoutRegionEntry.offset || { x: 0, y: 0 };
    } else if (Array.isArray(snoutRegionEntry)) {
      // Old format as array only
      const [x, y, width, height] = snoutRegionEntry;
      snoutRegion = { x, y, width, height };
      snoutOffset = { x: 0, y: 0 };
    } else if (typeof snoutRegionEntry === "object" && "x" in snoutRegionEntry && "y" in snoutRegionEntry) {
      // Old format as object
      snoutRegion = snoutRegionEntry;
      snoutOffset = { x: 0, y: 0 };
    } else {
      return res.status(500).send("Invalid snout region definition.");
    }

    // Apply the offset to the snout region
    snoutRegion = {
      ...snoutRegion,
      x: snoutRegion.x + (snoutOffset.x || 0),
      y: snoutRegion.y + (snoutOffset.y || 0)
    };

    try {
      const cropped = await extractFaceWithSnout(imageBuffer, outWidth, region, snoutRegion);
      res.set("Content-Type", "image/png");
      if (req.query.width && parseInt(req.query.width, 10) !== outWidth) {
        res.set("X-Actual-Width", outWidth.toString());
      }
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
