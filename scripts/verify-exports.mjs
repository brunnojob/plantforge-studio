import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import PptxGenJS from "pptxgenjs";
import { jsPDF } from "jspdf";
import { template, validateProject } from "../src/model.js";
import { buildPdf, buildPptx } from "../src/exports.js";
const project = validateProject(template());
project.name = "Projeto Offshore Brunnodev";
project.author = "brunnodev";
project.client = "Unidade de demonstração";
project.notes = "Planta conceitual para apresentação e estudo.";
const out = resolve("tmp/export-qa");
await mkdir(out, { recursive: true });
const image = process.argv[2]
  ? `data:image/png;base64,${(await readFile(process.argv[2])).toString("base64")}`
  : null;
await buildPptx(PptxGenJS, project).writeFile({
  fileName: resolve(out, "report.pptx"),
});
await writeFile(
  resolve(out, "report.pdf"),
  Buffer.from(buildPdf(jsPDF, project, image).output("arraybuffer")),
);
console.log(`Export QA files: ${out}`);
