const fs = require("fs");
const { execSync } = require("child_process");

try {
  const status = execSync("git status").toString();
  fs.writeFileSync("gitStatus.txt", status);
  console.log("gitStatus.txt written");
} catch (e) {
  fs.writeFileSync(
    "gitStatus.txt",
    e.toString() + "\n" + (e.stdout ? e.stdout.toString() : ""),
  );
  console.log("Error writing gitStatus.txt");
}
