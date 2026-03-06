const { spawn } = require("child_process");
const fs = require("fs");

const out = fs.openSync("./out.log", "a");
const err = fs.openSync("./err.log", "a");

const child = spawn("node", ["Server/index.js"], {
  detached: true,
  stdio: ["ignore", out, err],
});

child.unref();
console.log("Process started in background");
