const express = require("express");
const app = express();
const faceRoute = require("./routes/face");
const pingRoute = require("./routes/ping");
const versionRoute = require("./routes/version");
const readline = require("readline");
const { runScript } = require("./utils/shellCommand");

const PORT = process.env.PORT || 3000;

// Express routes
app.use("/faces", faceRoute);
app.use("/ping", pingRoute);
app.use("/version", versionRoute);

app.get("/", (req, res) => {
  res.send("PixelFace API is online.");
});

app.listen(PORT, () => {
  console.log(`🟢 Server running at http://localhost:${PORT}`);
  rl.prompt();
});

// REPL for shell commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "PixelFace> "
});

rl.on("line", async (line) => {
  const [cmd, ...args] = line.trim().split(/\s+/);
  if (cmd === "exit") {
    rl.close();
    process.exit(0);
  }
  try {
    const output = await runScript(cmd, args);
    if (output) console.log(output);
  } catch (err) {
    console.error(err.message);
  }
  rl.prompt();
});