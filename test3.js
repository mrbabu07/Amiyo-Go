const { execSync } = require("child_process");

try {
  const output = execSync("node Server/index.js", {
    stdio: "pipe",
    timeout: 3000, // Just run it briefly
  });
  console.log(output.toString());
} catch (e) {
  if (e.code === "ETIMEDOUT") {
    console.log("Server running:", e.stdout ? e.stdout.toString() : "");
  } else {
    console.error("error:", e.message);
    if (e.stderr) console.error("stderr:", e.stderr.toString());
  }
}
