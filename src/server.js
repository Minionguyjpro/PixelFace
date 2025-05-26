const express = require("express");
const app = express();
const faceRoute = require("./routes/face");
const pingRoute = require("./routes/ping");
const versionRoute = require("./routes/version");

const PORT = process.env.PORT || 3000;

app.use("/faces", faceRoute);
app.use("/ping", pingRoute);
app.use("/version", versionRoute);

app.get("/", (req, res) => {
  res.send("PixelFace API is online.");
});

app.listen(PORT, () => {
  console.log(`🟢 Server running at http://localhost:${PORT}`);
});
