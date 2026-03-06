const fs = require("fs");
const { execSync } = require("child_process");

try {
  console.log("Starting server crash test...");
  const output = execSync("node Server/index.js", {
    stdio: "pipe",
    timeout: 5000,
  });
  fs.writeFileSync(
    "error.log",
    "Server didn't crash within 5 seconds.\n" + output.toString(),
  );
} catch (e) {
  let log = `Error: ${e.message}\n`;
  if (e.stdout) log += `\nSTDOUT:\n${e.stdout.toString()}`;
  if (e.stderr) log += `\nSTDERR:\n${e.stderr.toString()}`;
  fs.writeFileSync("error.log", log);
}
console.log("Check error.log");
