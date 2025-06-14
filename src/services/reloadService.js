const fs = require("fs");
const path = require("path");

let faceRegions = {};
let backgroundRegions = {};
let snoutRegions = {};
let assetMappings = {};

function loadOverrides() {
  Object.assign(faceRegions, JSON.parse(fs.readFileSync(path.join(__dirname, "../overrides/faceRegions.json"))));
  Object.assign(backgroundRegions, JSON.parse(fs.readFileSync(path.join(__dirname, "../overrides/backgroundRegions.json"))));
  Object.assign(snoutRegions, JSON.parse(fs.readFileSync(path.join(__dirname, "../overrides/snoutRegions.json"))));
  Object.assign(assetMappings, JSON.parse(fs.readFileSync(path.join(__dirname, "../overrides/assetMappings.json"))));
}

function getOverrides() {
  return { faceRegions, backgroundRegions, snoutRegions, assetMappings };
}

// Initial load
loadOverrides();

module.exports = { loadOverrides, getOverrides };