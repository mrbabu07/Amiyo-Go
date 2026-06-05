const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || (!args.has("--execute") && process.env.MONGO_BACKUP_DRY_RUN !== "false");
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const backupRoot = path.resolve(process.env.MONGO_BACKUP_DIR || path.join(__dirname, "..", "backups"));
const mongodumpBin = process.env.MONGODUMP_BIN || "mongodump";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(backupRoot, `amiyo-go-${timestamp}`);

const maskUri = (uri = "") => uri.replace(/\/\/([^:/?#]+):([^@]+)@/, "//***:***@");

if (!mongoUri) {
  console.error("MONGODB_URI or MONGO_URI is required to create a MongoDB backup.");
  process.exit(1);
}

const commandArgs = ["--uri", mongoUri, "--out", outputDir];

console.log("MongoDB backup plan:");
console.log(`- Binary: ${mongodumpBin}`);
console.log(`- URI: ${maskUri(mongoUri)}`);
console.log(`- Output: ${outputDir}`);
console.log(`- Mode: ${dryRun ? "dry-run" : "execute"}`);

if (dryRun) {
  console.log("Dry run only. Re-run with --execute to create the backup.");
  process.exit(0);
}

fs.mkdirSync(backupRoot, { recursive: true });

const child = spawn(mongodumpBin, commandArgs, {
  stdio: "inherit",
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(`Failed to start ${mongodumpBin}: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`MongoDB backup completed: ${outputDir}`);
    return;
  }
  console.error(`MongoDB backup failed with exit code ${code}`);
  process.exit(code || 1);
});
