const path = require("path");

async function runScript(scriptName, args = []) {
  // Always assume JS file, add .js if not present
  const fileName = scriptName.endsWith(".js") ? scriptName : `${scriptName}.js`;
  const scriptPath = path.join(__dirname, "../commands", fileName);

  let scriptModule;
  try {
    scriptModule = require(scriptPath);
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND" && err.message.includes(scriptPath)) {
      throw new Error(`Error: command not found!`);
    }
    throw new Error(`Failed to load script "${fileName}": ${err.message}`);
  }

  if (typeof scriptModule === "function") {
    const result = await scriptModule(...args);
    return typeof result === "undefined" ? "OK" : result;
  } else if (typeof scriptModule.main === "function") {
    const result = await scriptModule.main(...args);
    return typeof result === "undefined" ? "OK" : result;
  } else {
    throw new Error(`JS script "${fileName}" must export a function or main()`);
  }
}

module.exports = { runScript };