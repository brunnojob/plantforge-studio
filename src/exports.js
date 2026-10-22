import { catalog, validateProject } from "./model.js";
import { simulate } from "./simulation.js";
export function filename(name) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "plantforge-projeto"
  );
}
export function bounds(project) {
  if (!project.items.length) return { x: 0, y: 0, w: 1000, h: 700 };
  const points = project.items.flatMap((i) => {
    const a = (i.rotation * Math.PI) / 180,
      cx = i.x + i.w / 2,
      cy = i.y + i.h / 2;
    return [
      [0, 0],
      [i.w, 0],
      [0, i.h + 40],
      [i.w, i.h + 40],
    ].map(([x, y]) => ({
      x: cx + (x - i.w / 2) * Math.cos(a) - (y - i.h / 2) * Math.sin(a),
      y: cy + (x - i.w / 2) * Math.sin(a) + (y - i.h / 2) * Math.cos(a),
    }));
  });
  const x = Math.min(...points.map((p) => p.x)) - 45,
    y = Math.min(...points.map((p) => p.y)) - 45;
  return {
    x,
    y,
    w: Math.max(...points.map((p) => p.x)) - x + 45,
    h: Math.max(...points.map((p) => p.y)) - y + 45,
  };
}
const chunks = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
const short = (value, length) =>
  value.length > length ? value.slice(0, length - 1) + "…" : value;
function ruleLines(project) {
  return project.rules.map(
    (r) =>
      `${project.items.find((i) => i.id === r.source)?.label} ${r.operator} ${r.threshold} → ${r.action === "on" ? "ligar / abrir" : "desligar / fechar"} ${project.items.find((i) => i.id === r.target)?.label}`,
  );
}
export function buildPptx(PptxGenJS, input, running = false) {
  const project = validateProject(input),
    deck = new PptxGenJS(),
    result = running ? simulate(project) : null;
  deck.layout = "LAYOUT_WIDE";
  deck.author = project.author || "brunnodev";
  deck.subject = "Planta conceitual e cenário de automação";
  deck.title = project.name;
  deck.company = project.client || "brunnodev";
  deck.lang = "pt-BR";
  deck.theme = { headFontFace: "Aptos", bodyFontFace: "Aptos", lang: "pt-BR" };
  function page(title, subtitle = "") {
    const slide = deck.addSlide();
    slide.background = { color: "101B25" };
    slide.addText(short(title, 160), {
      x: 0.45,
      y: 0.2,
      w: 12.4,
      h: 0.8,
      fontSize: 23,
      bold: true,
      color: "E6F4F1",
      margin: 0,
      breakLine: false,
      fit: "shrink",
    });
    slide.addText(short(subtitle, 240), {
      x: 0.45,
      y: 1.02,
      w: 12.4,
      h: 0.35,
      fontSize: 10,
      color: "9DB7C5",
      margin: 0,
      fit: "shrink",
    });
    slide.addText(
      "PlantForge Studio • brunnodev.store • Projeto conceitual • " +
        (running ? "Estados simulados" : "Estados base"),
      {
        x: 0.45,
        y: 7.12,
        w: 12.4,
        h: 0.15,
        fontSize: 8,
        color: "7F9AA9",
        margin: 0,
      },
    );
    return slide;
  }
  const first = page(
    project.name,
    [project.author, project.client].filter(Boolean).join(" | ") || "Planta 2D",
  );
  const b = bounds(project),
    scale = Math.min(12.3 / b.w, 5.35 / b.h),
    ox = 0.5 + (12.3 - b.w * scale) / 2 - b.x * scale,
    oy = 1.5 + (5.35 - b.h * scale) / 2 - b.y * scale;
  const pos = (i) => ({
    x: ox + i.x * scale,
    y: oy + i.y * scale,
    w: i.w * scale,
    h: i.h * scale,
  });
  const nodes = [...project.items].sort(
    (a, b) => (a.type === "zone" ? -1 : 0) - (b.type === "zone" ? -1 : 0),
  );
  const drawItem = (i) => {
    const p = pos(i),
      color = (i.color || catalog[i.type].color).slice(1);
    if (i.type !== "text")
      first.addShape(deck.ShapeType.rect, {
        ...p,
        rotate: i.rotation,
        rectRadius: 0.05,
        line: {
          color,
          width: i.type === "zone" ? 1 : 1.2,
          dashType: i.type === "zone" ? "dash" : "solid",
        },
        fill: { color: "192D3A", transparency: i.type === "zone" ? 65 : 0 },
      });
    first.addText(short(i.label, 32), {
      x: p.x,
      y: i.type === "zone" ? p.y + 0.04 : p.y + p.h + 0.025,
      w: Math.max(p.w, 0.25),
      h: 0.22,
      fontSize: Math.max(6, Math.min(10, p.w * 11)),
      color: i.type === "zone" ? "A6BFCC" : "E6F4F1",
      margin: 0,
      align: i.type === "zone" ? "left" : "center",
      fit: "shrink",
    });
    if (i.type !== "zone" && i.type !== "wall" && i.type !== "text")
      first.addText(catalog[i.type].name, {
        x: p.x,
        y: p.y + p.h * 0.25,
        w: p.w,
        h: p.h * 0.5,
        fontSize: Math.max(5, Math.min(9, p.w * 8)),
        color,
        align: "center",
        margin: 0,
        fit: "shrink",
        rotate: i.rotation,
      });
  };
  nodes.filter((i) => i.type === "zone").forEach(drawItem);
  for (const edge of project.connections) {
    const a = project.items.find((i) => i.id === edge.from),
      c = project.items.find((i) => i.id === edge.to);
    const ax = ox + (a.x + a.w / 2) * scale,
      ay = oy + (a.y + a.h / 2) * scale,
      bx = ox + (c.x + c.w / 2) * scale,
      by = oy + (c.y + c.h / 2) * scale;
    first.addShape(deck.ShapeType.line, {
      x: Math.min(ax, bx),
      y: Math.min(ay, by),
      w: Math.abs(bx - ax),
      h: Math.abs(by - ay),
      flipV: (bx - ax) * (by - ay) < 0,
      line: { color: "75E5C1", width: 1.2 },
    });
  }
  nodes.filter((i) => i.type !== "zone").forEach(drawItem);
  if (!nodes.length)
    first.addText("Planta sem componentes", {
      x: 3,
      y: 3,
      w: 7,
      h: 0.5,
      fontSize: 22,
      color: "A6BFCC",
      align: "center",
    });
  for (const [index, items] of chunks(project.items, 10).entries()) {
    const slide = page(
      "Inventário de componentes",
      `${project.name} | Página ${index + 1}`,
    );
    const header = ["Nome / tipo", "Camada", "Dimensões (m)", "Estado"];
    const rows = items.map((i) => [
      `${i.label}\n${catalog[i.type].name}`,
      i.layer,
      `${(i.w / 80).toFixed(2)} × ${(i.h / 80).toFixed(2)}`,
      (result ? result.states[i.id] : i.enabled)
        ? "Ligado / aberto"
        : "Desligado / fechado",
    ]);
    slide.addTable([header, ...rows], {
      x: 0.5,
      y: 1.5,
      w: 12.3,
      colW: [6.2, 1.7, 2.2, 2.2],
      rowH: 0.46,
      fontSize: 10,
      color: "D3E1E8",
      fill: "172A36",
      border: { type: "solid", pt: 0.5, color: "304551" },
      margin: 0.07,
      autoPage: false,
      verbose: false,
    });
  }
  const rules = ruleLines(project);
  for (const [index, lines] of chunks(
    rules.length ? rules : ["Nenhuma regra configurada."],
    8,
  ).entries()) {
    const slide = page(
      "Regras e cenário",
      `${project.name} | ${running ? "Simulação ativa" : "Estados base"} | Página ${index + 1}`,
    );
    lines.forEach((line, i) =>
      slide.addText(line, {
        x: 0.6,
        y: 1.65 + i * 0.6,
        w: 12.1,
        h: 0.5,
        fontSize: 13,
        color: "C4E5DD",
        margin: 0,
        fit: "shrink",
      }),
    );
  }
  const notes = [
    project.notes,
    ...project.items
      .filter((i) => i.notes)
      .map((i) => `${i.label}: ${i.notes}`),
  ]
    .filter(Boolean)
    .join("\n\n");
  if (notes)
    for (const [index, part] of (
      notes.match(/[\s\S]{1,850}/g) || []
    ).entries()) {
      page("Observações", `${project.name} | Página ${index + 1}`).addText(
        part,
        {
          x: 0.6,
          y: 1.6,
          w: 12.1,
          h: 5.1,
          fontSize: 14,
          color: "D3E1E8",
          margin: 0,
          breakLine: false,
          fit: "shrink",
        },
      );
    }
  return deck;
}
export function buildPdf(JsPDF, input, png, running = false) {
  const project = validateProject(input),
    pdf = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" }),
    result = running ? simulate(project) : null;
  pdf.setProperties({
    title: project.name,
    author: project.author || "brunnodev",
    subject: "Planta conceitual",
  });
  const page = (title, subtitle = "") => {
    pdf.setFillColor("#101b25");
    pdf.rect(0, 0, 297, 210, "F");
    pdf.setTextColor("#e6f4f1");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(19);
    pdf.text(pdf.splitTextToSize(title, 272).slice(0, 2), 12, 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor("#9db7c5");
    pdf.text(pdf.splitTextToSize(subtitle, 272).slice(0, 2), 12, 34);
    pdf.setFontSize(8);
    pdf.text(
      "PlantForge Studio | brunnodev.store | Projeto conceitual",
      12,
      202,
    );
  };
  page(
    project.name,
    [
      project.author,
      project.client,
      running ? "Estados simulados" : "Estados base",
    ]
      .filter(Boolean)
      .join(" | "),
  );
  if (png) {
    const b = bounds(project),
      scale = Math.min(273 / b.w, 150 / b.h);
    pdf.addImage(
      png,
      "PNG",
      12 + (273 - b.w * scale) / 2,
      44 + (150 - b.h * scale) / 2,
      b.w * scale,
      b.h * scale,
    );
  } else {
    pdf.setFontSize(16);
    pdf.text("Planta sem componentes", 100, 100);
  }
  for (const [index, items] of chunks(project.items, 9).entries()) {
    pdf.addPage();
    page("Inventário de componentes", `${project.name} | Página ${index + 1}`);
    pdf.setFontSize(10);
    items.forEach((i, n) => {
      const y = 48 + n * 16;
      pdf.setTextColor("#e6f4f1");
      pdf.text(pdf.splitTextToSize(i.label, 180).slice(0, 2), 12, y);
      pdf.setFontSize(8);
      pdf.setTextColor("#9db7c5");
      pdf.text(
        `${catalog[i.type].name} | ${i.layer} | ${(i.w / 80).toFixed(2)} x ${(i.h / 80).toFixed(2)} m`,
        12,
        y + 8,
      );
      pdf.text(
        (result ? result.states[i.id] : i.enabled)
          ? "Ligado / aberto"
          : "Desligado / fechado",
        230,
        y,
      );
      pdf.setFontSize(10);
    });
  }
  const lines = ruleLines(project).map((s) => s.replace("→", "->"));
  for (const [index, rules] of chunks(
    lines.length ? lines : ["Nenhuma regra configurada."],
    8,
  ).entries()) {
    pdf.addPage();
    page("Regras e cenário", `${project.name} | Página ${index + 1}`);
    pdf.setFontSize(11);
    rules.forEach((r, n) =>
      pdf.text(pdf.splitTextToSize(r, 272).slice(0, 3), 12, 50 + n * 18),
    );
  }
  const notes = [
    project.notes,
    ...project.items
      .filter((i) => i.notes)
      .map((i) => `${i.label}: ${i.notes}`),
  ]
    .filter(Boolean)
    .join("\n\n");
  if (notes) {
    pdf.setFontSize(11);
    for (const part of chunks(pdf.splitTextToSize(notes, 272), 24)) {
      pdf.addPage();
      page("Observações", project.name);
      pdf.setFontSize(11);
      pdf.text(part, 12, 50);
    }
  }
  return pdf;
}
function loadScript(path, test) {
  if (test()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(path, import.meta.url).href;
    script.onload = () =>
      test()
        ? resolve()
        : reject(new Error("Biblioteca de exportação inválida."));
    script.onerror = () => {
      script.remove();
      reject(
        new Error("Não foi possível carregar a exportação. Tente novamente."),
      );
    };
    document.head.append(script);
  });
}
export async function planPng(svg, project) {
  const b = bounds(project),
    copy = svg.cloneNode(true);
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("viewBox", `${b.x} ${b.y} ${b.w} ${b.h}`);
  const scale = Math.min(2, 2200 / Math.max(b.w, b.h)),
    w = Math.ceil(b.w * scale),
    h = Math.ceil(b.h * scale);
  copy.setAttribute("width", w);
  copy.setAttribute("height", h);
  const blob = new Blob([new XMLSerializer().serializeToString(copy)], {
      type: "image/svg+xml",
    }),
    url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111b25";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function exportReport(format, project, svg, running) {
  if (format === "pptx") {
    await loadScript(
      "../vendor/pptxgen.bundle.js",
      () => typeof window.PptxGenJS === "function",
    );
    await buildPptx(window.PptxGenJS, project, running).writeFile({
      fileName: `${filename(project.name)}.pptx`,
    });
  } else {
    await loadScript("../vendor/jspdf.umd.min.js", () => !!window.jspdf?.jsPDF);
    const png = project.items.length ? await planPng(svg, project) : null;
    buildPdf(window.jspdf.jsPDF, project, png, running).save(
      `${filename(project.name)}.pdf`,
    );
  }
}
