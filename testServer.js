const { execSync } = require("child_process");

try {
  console.log("Starting server test run...");
  const output = execSync("node Server/index.js", {
    stdio: "pipe",
    timeout: 5000, // Only run it for a few seconds to see if it boots and doesn't crash
  });
  console.log(output.toString());
} catch (e) {
  if (e.code === "ETIMEDOUT") {
    console.log(
      "Server stayed alive for 5 seconds without crashing! Output:",
      e.stdout ? e.stdout.toString() : "",
    );
  } else {
    console.error("Server crashed:", e.message);
    if (e.stdout) console.log("Stdout:", e.stdout.toString());
    if (e.stderr) console.error("Stderr:", e.stderr.toString());
  }
}
