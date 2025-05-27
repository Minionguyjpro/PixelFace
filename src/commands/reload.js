const { loadOverrides } = require('../services/reloadService');

module.exports = async function () {
  loadOverrides();
  return "Overrides reloaded!";
};