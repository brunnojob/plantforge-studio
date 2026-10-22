import { test } from "node:test";
import assert from "node:assert/strict";
import { template, validateProject } from "../src/model.js";
import { ProjectStore } from "../src/storage.js";
import { fetchTemplates } from "../src/templates.js";
import { bounds, filename, buildPptx, buildPdf } from "../src/exports.js";
import PptxGenJS from "pptxgenjs";
import { jsPDF } from "jspdf";
function memory() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
  };
}
test("legacy browser project migrates without losing its name or items", () => {
  const storage = memory(),
    p = template();
  p.name = "Trabalho existente";
  storage.setItem("plantforge.v1", JSON.stringify(p));
  const workspace = new ProjectStore(storage);
  assert.equal(workspace.active().name, p.name);
  assert.equal(workspace.active().items.length, p.items.length);
  assert.ok(storage.getItem("plantforge.v1"));
  assert.equal(new ProjectStore(storage).active().name, p.name);
});
test("projects can be renamed, switched and restored after reload without mixing documents", () => {
  const storage = memory(),
    workspace = new ProjectStore(storage),
    a = workspace.create(template());
  const first = workspace.active();
  first.name = "Unidade A";
  first.author = "Brunno";
  workspace.save(first);
  const b = workspace.create(template("retail"));
  assert.notEqual(a, b);
  assert.equal(workspace.open(a).name, "Unidade A");
  const restored = new ProjectStore(storage);
  assert.equal(restored.active().author, "Brunno");
  assert.equal(restored.list().length, 2);
  assert.notEqual(restored.open(b).name, "Unidade A");
});
test("quota failures leave the previous in-memory and stored document intact", () => {
  const storage = memory(),
    workspace = new ProjectStore(storage);
  workspace.create(template());
  const original = workspace.active();
  storage.setItem = () => {
    throw new Error("quota");
  };
  const changed = structuredClone(original);
  changed.name = "Unsaved";
  assert.throws(() => workspace.save(changed));
  assert.equal(workspace.active().name, original.name);
});
test("database templates validate referenced components and safely reject malformed models", async () => {
  const rows = [
    { slug: "offshore", title: "Modelo", description: "", project: template() },
  ];
  assert.equal(
    (await fetchTemplates(async () => ({ ok: true, json: async () => rows })))
      .length,
    1,
  );
  rows[0].project.rules[0].target = "missing";
  await assert.rejects(() =>
    fetchTemplates(async () => ({ ok: true, json: async () => rows })),
  );
});
test("new properties accept named custom components and reject invalid colors", () => {
  const p = template();
  p.author = "Brunnodev";
  p.items[0].notes = "Área de processo";
  p.items[0].layer = "Estrutura";
  p.items[0].color = "#123456";
  assert.equal(validateProject(p).items[0].notes, "Área de processo");
  p.items[0].color = "url(javascript:x)";
  assert.throws(() => validateProject(p));
});
test("export bounds include rotated geometry and filenames support Portuguese titles", () => {
  const p = template();
  p.items = [{ ...p.items[1], x: 0, y: 0, w: 200, h: 100, rotation: 90 }];
  p.connections = [];
  p.rules = [];
  assert.ok(bounds(p).y < 0);
  assert.equal(filename("Área elétrica / Deck A"), "Area-eletrica-Deck-A");
  assert.equal(filename("???"), "plantforge-projeto");
});
test("exports contain project data, paginate inventories and produce valid file signatures", async () => {
  const p = validateProject(template());
  p.name = "Área elétrica";
  p.author = "Brunnodev";
  p.notes = "Observações para o relatório.";
  for (let n = 0; n < 20; n++)
    p.items.push({
      ...structuredClone(p.items[1]),
      id: `extra-${n}`,
      label: `Equipamento ${n}`,
    });
  const deck = buildPptx(PptxGenJS, p);
  const buffer = await deck.write({ outputType: "nodebuffer" });
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  const pdf = buildPdf(jsPDF, p, null);
  assert.ok(pdf.getNumberOfPages() >= 6);
  assert.equal(pdf.output().slice(0, 4), "%PDF");
});
