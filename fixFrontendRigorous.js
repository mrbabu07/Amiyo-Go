const fs = require("fs");
const path = require("path");

let totalFixed = 0;

function processEmptyComponents(dir) {
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat && stat.isDirectory()) {
        processEmptyComponents(fullPath); // Recursive call
      } else if (file.endsWith(".jsx")) {
        // If file is empty or nearly empty or doesn't have a default export
        const content = fs.readFileSync(fullPath, "utf8");
        if (stat.size < 20 || !content.includes("export default")) {
          const componentName = file
            .replace(".jsx", "")
            .replace(/[^a-zA-Z0-9]/g, "");
          const newContent = `export default function ${componentName}() {\n  return <div style={{border: "1px solid red", padding: "4px", margin: "4px"}}>${componentName} [MISSING FILE]</div>;\n}\n`;
          fs.writeFileSync(fullPath, newContent);
          console.log("Fixed JSX:", fullPath);
          totalFixed++;
        }
      } else if (file.endsWith(".js")) {
        const content = fs.readFileSync(fullPath, "utf8");
        if (
          stat.size < 20 &&
          !content.includes("export ") &&
          !content.includes("module.exports")
        ) {
          fs.writeFileSync(fullPath, `export default {};\n`);
          console.log("Fixed JS:", fullPath);
          totalFixed++;
        }
      }
    });
  } catch (e) {
    console.log("Error reading directory: " + dir, e);
  }
}

console.log("Starting to fix empty React components comprehensively...");
processEmptyComponents(path.join(__dirname, "Client", "src"));
console.log("Done. Fixed " + totalFixed + " files.");
