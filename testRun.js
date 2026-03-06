const { execSync } = require("child_process");
const fs = require("fs");

try {
  console.log("Running node Server/index.js...");
  execSync("node Server/index.js", {
    stdio: [
      "ignore",
      fs.openSync("run_out.log", "w"),
      fs.openSync("run_err.log", "w"),
    ],
    timeout: 10000,
  });
} catch (e) {
  console.log("Process exited. Check run_out.log and run_err.log");
}
