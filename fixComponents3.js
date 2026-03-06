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
        processEmptyComponents(fullPath);
      } else if (file.endsWith(".jsx") && stat.size < 20) {
        // Generate a component name from the filename
        const componentName = file
          .replace(".jsx", "")
          .replace(/[^a-zA-Z0-9]/g, "");

        // Write the placeholder component
        const content = `export default function ${componentName}() {\n  return <div style={{border: '1px solid red', margin: '4px', padding: '4px'}}>${componentName} [MISSING FILE]</div>;\n}\n`;
        fs.writeFileSync(fullPath, content);
        totalFixed++;
      }
    });
  } catch (e) {
    console.log("Error reading directory: " + dir);
  }
}

console.log("Starting to fix empty React components...");
processEmptyComponents(path.join(__dirname, "Client", "src", "components"));
processEmptyComponents(path.join(__dirname, "Client", "src", "pages"));
processEmptyComponents(path.join(__dirname, "Client", "src", "layouts"));
fs.writeFileSync("fixed_components.txt", `Total fixed: ${totalFixed}`);
console.log("Done. Fixed " + totalFixed);
