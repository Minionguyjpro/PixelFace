const axios = require("axios");

async function fetchImageFromUrl(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary");
  } catch (err) {
    if (err.response?.status === 404) {
      throw err; // bubble up to try the next URL
    } else {
      throw new Error(`HTTP fetch failed: ${err.message}`);
    }
  }
}

module.exports = {
  fetchImageFromUrl
};
