const fs = require("fs");
const path = require("path");

const originalConsoleError = console.error;
const originalConsoleLog = console.log;

let logs = "";

console.error = function (...args) {
  logs += args.join(" ") + "\n";
  originalConsoleError.apply(console, args);
  fs.writeFileSync(path.join(__dirname, "server_output.txt"), logs);
};

console.log = function (...args) {
  logs += args.join(" ") + "\n";
  originalConsoleLog.apply(console, args);
  fs.writeFileSync(path.join(__dirname, "server_output.txt"), logs);
};

try {
  require("./Server/index.js");
} catch (e) {
  console.error("Uncaught exception:", e);
}
