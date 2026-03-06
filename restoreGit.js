const { execSync } = require("child_process");

try {
  // Let's just try to restore all files in Server/routes and Server/controllers from git HEAD
  console.log("Restoring routes...");
  execSync("git checkout HEAD -- Server/routes", { stdio: "inherit" });

  console.log("Restoring controllers...");
  execSync("git checkout HEAD -- Server/controllers", { stdio: "inherit" });

  console.log("Restore complete.");
} catch (e) {
  console.error("Error during restore:", e.message);
}
