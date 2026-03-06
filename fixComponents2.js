const fs = require("fs");
const path = require("path");

function processEmptyComponents(dir) {
  let count = 0;
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat && stat.isDirectory()) {
        count += processEmptyComponents(fullPath);
      } else if (file.endsWith(".jsx") && stat.size < 20) {
        // Generate a component name from the filename
        const componentName = file
          .replace(".jsx", "")
          .replace(/[^a-zA-Z0-9]/g, "");

        // Write the placeholder component
        const content = `export default function ${componentName}() {\n  return <div style={{border: '1px solid red', margin: '4px', padding: '4px'}}>${componentName} [MISSING FILE]</div>;\n}\n`;
        fs.writeFileSync(fullPath, content);
        count++;
      }
    });
  } catch (e) {
    console.log("Error reading directory: " + dir);
  }
  return count;
}

console.log("Starting to fix empty React components...");
let total = 0;
total += processEmptyComponents(
  path.join(__dirname, "Client", "src", "components"),
);
total += processEmptyComponents(path.join(__dirname, "Client", "src", "pages"));
total += processEmptyComponents(
  path.join(__dirname, "Client", "src", "layouts"),
);
fs.writeFileSync("fixed_components.txt", `Total fixed: ${total}`);
console.log("Done. Fixed " + total);
