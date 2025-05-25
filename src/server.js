const express = require("express");
const app = express();
const faceRoute = require("./routes/face");

const PORT = process.env.PORT || 3000;

app.use("/faces", faceRoute);

app.get("/", (req, res) => {
  res.send("PixelFace API is online.");
});

app.listen(PORT, () => {
  console.log(`🟢 Server running at http://localhost:${PORT}`);
});
