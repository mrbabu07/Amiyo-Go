const fs = require("fs");
const path = require("path");

function findEmptyFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(findEmptyFiles(file));
      } else {
        if ((file.endsWith(".js") || file.endsWith(".jsx")) && stat.size < 20) {
          results.push(file);
        }
      }
    });
  } catch (e) {
    console.log("Error reading directory: " + dir);
  }
  return results;
}

try {
  const emptyFrontend = findEmptyFiles(path.join(__dirname, "Client", "src"));
  fs.writeFileSync(
    "empty_frontend.log",
    JSON.stringify(emptyFrontend, null, 2),
  );
  console.log("Found " + emptyFrontend.length + " empty files in Client/src");
} catch (e) {
  console.error("Error:", e.message);
}
