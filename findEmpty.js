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
        // Any file less than 20 bytes is probably empty or practically empty
        if (file.endsWith(".js") && stat.size < 20) {
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
  const emptyRoutes = findEmptyFiles(path.join(__dirname, "Server", "routes"));
  const emptyControllers = findEmptyFiles(
    path.join(__dirname, "Server", "controllers"),
  );
  fs.writeFileSync(
    "empty.log",
    JSON.stringify(
      { routes: emptyRoutes, controllers: emptyControllers },
      null,
      2,
    ),
  );
} catch (e) {
  fs.writeFileSync("empty.log", "Error: " + e.message);
}
