import { copyFile, mkdir } from "node:fs/promises";
await mkdir("vendor", { recursive: true });
for (const [source, target] of [
  ["node_modules/pptxgenjs/dist/pptxgen.bundle.js", "vendor/pptxgen.bundle.js"],
  ["node_modules/jspdf/dist/jspdf.umd.min.js", "vendor/jspdf.umd.min.js"],
  ["node_modules/pptxgenjs/LICENSE", "vendor/LICENSE-pptxgenjs"],
  ["node_modules/jspdf/LICENSE", "vendor/LICENSE-jspdf"],
])
  await copyFile(source, target);
