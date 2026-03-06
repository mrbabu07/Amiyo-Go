const fs = require("fs");
let success = false;
try {
  require("./Server/index.js");
  success = true;
  console.log("SUCCESS");
  setTimeout(() => process.exit(0), 1000);
} catch (e) {
  console.log("FAIL", e.message);
  process.exit(1);
}
