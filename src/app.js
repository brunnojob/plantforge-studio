import {
  catalog,
  component,
  template,
  validateProject,
  removeItem,
  History,
  uid,
  snap,
  layers,
} from "./model.js";
import { simulate } from "./simulation.js";
import { ProjectStore } from "./storage.js";
import { builtInTemplates, fetchTemplates } from "./templates.js";
import { exportReport, filename, bounds } from "./exports.js";
const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let project = template(),
  selected = null,
  tool = "select",
  connectFrom = null,
  running = false,
  zoom = 1,
  drag = null;
const history = new History();
let workspace;
let availableTemplates = builtInTemplates;
try {
  workspace = new ProjectStore(localStorage);
  project = workspace.active() || validateProject(project);
  if (!workspace.active()) workspace.create(project);
} catch {
  project = validateProject(project);
  toast(
    "Não foi possível abrir o salvamento local. Exporte JSON para manter um backup.",
  );
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.remove("show"), 4000);
}
function save() {
  try {
    if (!workspace) throw new Error("Armazenamento indisponível.");
    workspace.save(project);
    $("saveState").textContent = "Salvo neste navegador";
  } catch {
    $("saveState").textContent = "Falha ao salvar · exporte JSON";
  }
}
function change(action) {
  history.push(project);
  action();
  save();
  render();
}
function options(value) {
  return project.items
    .map(
      (i) =>
        `<option value="${escape(i.id)}" ${i.id === value ? "selected" : ""}>${escape(i.label)}</option>`,
    )
    .join("");
}
function renderCatalog() {
  const query = $("search").value.toLocaleLowerCase("pt-BR");
  $("catalog").innerHTML = [
    ...new Set(Object.values(catalog).map((i) => i.group)),
  ]
    .map((group) => {
      const entries = Object.entries(catalog).filter(
        ([, s]) =>
          s.group === group &&
          s.name.toLocaleLowerCase("pt-BR").includes(query),
      );
      return entries.length
        ? `<h3>${group}</h3><div class="catalog-grid">${entries.map(([type, s]) => `<button data-add="${type}" class="component-card ${tool === type ? "chosen" : ""}"><span style="color:${s.color}">${s.icon}</span>${s.name}</button>`).join("")}</div>`
        : "";
    })
    .join("");
}
function draw() {
  const result = running ? simulate(project) : null;
  const nodes = [...project.items].sort(
    (a, b) => (a.type === "zone" ? -1 : 0) - (b.type === "zone" ? -1 : 0),
  );
  const edges = project.connections
    .map((c) => {
      const a = project.items.find((i) => i.id === c.from),
        b = project.items.find((i) => i.id === c.to);
      if (!a || !b) return "";
      const x = a.x + a.w / 2,
        y = a.y + a.h / 2,
        bx = b.x + b.w / 2,
        by = b.y + b.h / 2;
      return `<path d="M${x},${y} H${(x + bx) / 2} V${by} H${bx}" fill="none" stroke="#48cbb6" stroke-width="2" marker-end="url(#arrow)" stroke-dasharray="${running ? "8 5" : "0"}" class="${running ? "flow" : ""}"/>`;
    })
    .join("");
  const nodeMarkup = (i) => {
    const s = { ...catalog[i.type], color: i.color || catalog[i.type].color },
      active = result ? result.states[i.id] : i.enabled,
      zone = i.type === "zone";
    return `<g data-id="${escape(i.id)}" transform="translate(${i.x} ${i.y}) rotate(${i.rotation} ${i.w / 2} ${i.h / 2})" class="node ${selected === i.id ? "selected" : ""}" style="--node-color:${s.color}"><title>${escape(i.label)}</title><rect width="${i.w}" height="${i.h}" rx="${zone ? 3 : 8}" fill="${zone ? "#23384b22" : "#172732"}" stroke="${selected === i.id ? "#e0fff8" : s.color}" stroke-width="${selected === i.id ? 2.5 : 1.4}" ${zone ? 'stroke-dasharray="8 5"' : ""}/>${!zone && i.type !== "wall" && i.type !== "door" ? `<text x="${i.w / 2}" y="${i.h / 2 + 7}" text-anchor="middle" fill="${s.color}" font-size="26">${s.icon}</text>` : ""}<text x="${zone ? 12 : i.w / 2}" y="${zone ? 24 : i.h + 18}" text-anchor="${zone ? "start" : "middle"}" fill="${zone ? "#7f9aaf" : "#c8d7e3"}" font-size="${zone ? 12 : 11}" font-family="monospace">${escape(i.label)}</text>${!zone && i.type !== "wall" ? `<circle cx="${i.w - 7}" cy="7" r="3" fill="${active ? "#5de2bc" : "#697481"}"/>` : ""}${running && ["gas", "temperature", "presence"].includes(i.type) ? `<text x="${i.w / 2}" y="${i.h + 32}" text-anchor="middle" fill="#5de2bc" font-size="11">${i.value}</text>` : ""}</g>`;
  };
  $("drawing").innerHTML =
    nodes
      .filter((i) => i.type === "zone")
      .map(nodeMarkup)
      .join("") +
    edges +
    nodes
      .filter((i) => i.type !== "zone")
      .map(nodeMarkup)
      .join("");
  $("itemCount").textContent = project.items.length;
  $("areaCount").innerHTML = `${project.items
    .filter((i) => i.type === "zone")
    .reduce((sum, i) => sum + (i.w * i.h) / 6400, 0)
    .toFixed(1)} <span>m²</span>`;
  $("activeCount").textContent = result ? result.active : "—";
  $("ruleCount").textContent = project.rules.length;
  $("simStatus").textContent = running
    ? "SIMULAÇÃO EM EXECUÇÃO"
    : "SIMULAÇÃO PAUSADA";
  $("run").textContent = running ? "Ⅱ Pausar" : "▶ Simular";
  $("run").classList.toggle("running", running);
  $("events").innerHTML = result
    ? result.events.length
      ? result.events
          .map(
            (e) =>
              `<div class="event ${e.level}"><span>${e.level === "conflict" ? "CONFLITO" : "REGRA"}</span> ${escape(e.message)}</div>`,
          )
          .join("")
      : "Nenhuma condição atendida. Os estados base foram mantidos."
    : "Altere os sensores e inicie a simulação para testar suas regras.";
}
function renderInspector() {
  const i = project.items.find((i) => i.id === selected);
  $("inspector").innerHTML = i
    ? `<div class="selected-heading"><span style="color:${catalog[i.type].color}">${catalog[i.type].icon}</span><div><small>${catalog[i.type].group}</small><h2>${catalog[i.type].name}</h2></div></div><label>Nome do item<input data-prop="label" value="${escape(i.label)}" maxlength="100"></label><div class="row"><label>X<input data-prop="x" type="number" value="${i.x}" min="0" max="2000" step="10"></label><label>Y<input data-prop="y" type="number" value="${i.y}" min="0" max="1400" step="10"></label></div><div class="row"><label>Largura<input data-prop="w" type="number" value="${i.w}" min="10" max="1500" step="10"></label><label>Altura<input data-prop="h" type="number" value="${i.h}" min="10" max="1000" step="10"></label></div><div class="row"><label>Rotação °<input data-prop="rotation" type="number" value="${i.rotation}" min="-360" max="360" step="15"></label><label>Valor do sensor<input data-prop="value" type="number" value="${i.value}" min="-100000" max="100000" step="any"></label></div><label class="checkbox"><input data-prop="enabled" type="checkbox" ${i.enabled ? "checked" : ""}> Estado base ligado / aberto</label><div class="row"><button id="duplicate">Duplicar</button><button id="delete" class="danger">Excluir</button></div><div class="row"><label>Cor<input data-prop="color" type="color" value="${i.color || catalog[i.type].color}"></label><label>Camada<select data-prop="layer">${layers.map((layer) => `<option ${i.layer === layer ? "selected" : ""}>${layer}</option>`).join("")}</select></label></div><label>Observação<textarea data-prop="notes" maxlength="300" rows="3">${escape(i.notes || "")}</textarea></label><label class="checkbox"><input data-prop="locked" type="checkbox" ${i.locked ? "checked" : ""}> Bloquear movimentação</label><small class="muted">80 unidades = 1 m · área = soma das zonas</small>`
    : '<div class="empty"><span>↖</span><h2>Seu próximo detalhe.</h2><p>Selecione um componente para ajustar posição, dimensões e estado.</p></div>';
  const source = $("ruleSource").value,
    target = $("ruleTarget").value;
  $("ruleSource").innerHTML = options(source);
  $("ruleTarget").innerHTML = options(target);
  $("rulesBadge").textContent = project.rules.length;
  $("rules").innerHTML = project.rules
    .map(
      (r) =>
        `<div class="rule"><div>Se <b>${escape(project.items.find((i) => i.id === r.source)?.label)}</b> ${escape(r.operator)} ${r.threshold}<br><span>→ ${r.action === "on" ? "ligar" : "desligar"} ${escape(project.items.find((i) => i.id === r.target)?.label)}</span></div><button data-remove-rule="${escape(r.id)}" aria-label="Excluir regra">×</button></div>`,
    )
    .join("");
  $("itemList").innerHTML =
    project.items
      .map(
        (i) =>
          `<button class="list-item" data-select="${escape(i.id)}">${escape(i.label)} <small>${catalog[i.type].name}</small></button>`,
      )
      .join("") || "<p>Nenhum componente.</p>";
}
function render() {
  $("projectName").value = project.name;
  $("sceneTitle").textContent = project.name;
  draw();
  renderInspector();
  renderCatalog();
  $("undo").disabled = !history.past.length;
  $("redo").disabled = !history.future.length;
}
function setTool(next) {
  tool = next;
  connectFrom = null;
  $("selectTool").classList.toggle("active", next === "select");
  $("connectTool").classList.toggle("active", next === "connect");
  $("toolHint").textContent =
    next === "select"
      ? "Selecione para editar · arraste para mover"
      : next === "connect"
        ? "Clique na origem e depois no destino"
        : `Clique para inserir: ${catalog[next].name}`;
  renderCatalog();
}
function point(event) {
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    $("canvas").getScreenCTM().inverse(),
  );
  return {
    x: Math.max(0, Math.min(2000, snap(p.x))),
    y: Math.max(0, Math.min(1400, snap(p.y))),
  };
}
$("canvas").addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const id = event.target.closest("[data-id]")?.dataset.id,
    p = point(event);
  if (Object.hasOwn(catalog, tool)) {
    if (project.items.length >= 500) {
      toast("Limite de 500 componentes.");
      return;
    }
    change(() => {
      const i = component(tool, p.x, p.y, uniqueName(catalog[tool].name));
      project.items.push(i);
      selected = i.id;
    });
    return;
  }
  if (tool === "connect") {
    if (!id) return;
    if (!connectFrom) {
      connectFrom = id;
      selected = id;
      draw();
      $("toolHint").textContent = "Agora clique no destino";
      return;
    }
    if (
      id !== connectFrom &&
      !project.connections.some((c) => c.from === connectFrom && c.to === id)
    )
      change(() =>
        project.connections.push({ id: uid(), from: connectFrom, to: id }),
      );
    connectFrom = null;
    $("toolHint").textContent = "Clique na origem e depois no destino";
    return;
  }
  selected = id || null;
  renderInspector();
  draw();
  if (id) {
    const i = project.items.find((i) => i.id === id);
    if (i.locked) return;
    drag = {
      id,
      start: p,
      x: i.x,
      y: i.y,
      before: structuredClone(project),
      moved: false,
    };
    $("canvas").setPointerCapture(event.pointerId);
  }
});
$("canvas").addEventListener("pointermove", (event) => {
  if (!drag) return;
  const p = point(event),
    i = project.items.find((i) => i.id === drag.id);
  const x = Math.max(0, Math.min(2000, drag.x + p.x - drag.start.x)),
    y = Math.max(0, Math.min(1400, drag.y + p.y - drag.start.y));
  if (x !== i.x || y !== i.y) drag.moved = true;
  i.x = x;
  i.y = y;
  draw();
});
function finishDrag() {
  if (!drag) return;
  if (drag.moved) {
    history.push(drag.before);
    save();
  }
  drag = null;
  render();
}
$("canvas").addEventListener("pointerup", finishDrag);
$("canvas").addEventListener("pointercancel", finishDrag);
$("catalog").addEventListener("click", (e) => {
  const type = e.target.closest("[data-add]")?.dataset.add;
  if (type) setTool(type);
});
$("search").addEventListener("input", renderCatalog);
$("selectTool").onclick = () => setTool("select");
$("connectTool").onclick = () => setTool("connect");
$("inspector").addEventListener("change", (e) => {
  const key = e.target.dataset.prop;
  if (!key) return;
  const i = project.items.find((i) => i.id === selected);
  if (!i) return;
  if (!e.target.checkValidity()) {
    toast("Valor fora dos limites.");
    renderInspector();
    return;
  }
  change(() => {
    i[key] = ["label", "color", "notes", "layer"].includes(key)
      ? key === "label"
        ? e.target.value.trim() || catalog[i.type].name
        : e.target.value
      : ["enabled", "locked"].includes(key)
        ? e.target.checked
        : Number(e.target.value);
  });
});
$("inspector").addEventListener("click", (e) => {
  if (e.target.id === "delete" && selected)
    change(() => {
      removeItem(project, selected);
      selected = null;
    });
  if (e.target.id === "duplicate" && selected)
    change(() => {
      if (project.items.length >= 500) {
        toast("Limite de 500 componentes.");
        return;
      }
      const i = structuredClone(project.items.find((i) => i.id === selected));
      i.id = uid();
      i.x = Math.min(2000, i.x + 20);
      i.y = Math.min(1400, i.y + 20);
      i.label = uniqueName((i.label + " cópia").slice(0, 90));
      project.items.push(i);
      selected = i.id;
    });
});
$("itemList").addEventListener("click", (e) => {
  const id = e.target.closest("[data-select]")?.dataset.select;
  if (id) {
    selected = id;
    setTool("select");
    render();
  }
});
$("ruleForm").onsubmit = (e) => {
  e.preventDefault();
  if (!project.items.length) return;
  if (project.rules.length >= 1000) {
    toast("Limite de 1.000 regras.");
    return;
  }
  change(() =>
    project.rules.push({
      id: uid(),
      source: $("ruleSource").value,
      operator: $("ruleOperator").value,
      threshold: Number($("threshold").value),
      target: $("ruleTarget").value,
      action: $("ruleAction").value,
    }),
  );
};
$("rules").onclick = (e) => {
  const id = e.target.closest("[data-remove-rule]")?.dataset.removeRule;
  if (id)
    change(() => (project.rules = project.rules.filter((r) => r.id !== id)));
};
function beginProject(data) {
  if (workspace) workspace.save(project);
  const next = validateProject(data);
  if (!workspace)
    throw new Error("Armazenamento local indisponível. Faça um backup JSON.");
  workspace.create(next);
  project = next;
  selected = null;
  running = false;
  history.past = [];
  history.future = [];
  setTool("select");
  render();
  toast("Novo projeto salvo neste navegador.");
}
$("blank").onclick = () => {
  try {
    beginProject({
      version: 1,
      name: "Novo projeto",
      items: [],
      connections: [],
      rules: [],
    });
    $("detailsButton").click();
  } catch (error) {
    toast(error.message);
  }
};
$("projectName").onchange = () =>
  change(
    () => (project.name = $("projectName").value.trim() || "Novo projeto"),
  );
$("undo").onclick = () => {
  project = history.undo(project);
  selected = null;
  save();
  render();
};
$("redo").onclick = () => {
  project = history.redo(project);
  selected = null;
  save();
  render();
};
$("run").onclick = () => {
  running = !running;
  draw();
};
function setZoom(value) {
  zoom = Math.max(0.4, Math.min(2.5, value));
  $("canvas").setAttribute("viewBox", `0 0 ${1000 / zoom} ${700 / zoom}`);
  $("zoomLabel").textContent = `${Math.round(zoom * 100)}%`;
}
$("zoomIn").onclick = () => setZoom(zoom + 0.2);
$("zoomOut").onclick = () => setZoom(zoom - 0.2);
$("fit").onclick = () => {
  const width = Math.max(900, ...project.items.map((i) => i.x + i.w + 80)),
    height = Math.max(630, ...project.items.map((i) => i.y + i.h + 100));
  setZoom(Math.min(1000 / width, 700 / height));
};
function download(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("exportJson").onclick = () =>
  download(
    JSON.stringify(project, null, 2),
    "application/json",
    `${filename(project.name)}.json`,
  );
$("exportSvg").onclick = () => {
  const svg = $("canvas").cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const b = bounds(project);
  svg.setAttribute("viewBox", `${b.x} ${b.y} ${b.w} ${b.h}`);
  svg
    .querySelectorAll(".selected")
    .forEach((n) => n.classList.remove("selected"));
  download(
    new XMLSerializer().serializeToString(svg),
    "image/svg+xml",
    `${filename(project.name)}.svg`,
  );
};
$("importJson").onclick = () => $("file").click();
$("file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2000000) throw new Error("Arquivo maior que 2 MB.");
    const data = validateProject(JSON.parse(await file.text()));
    beginProject(data);
    toast("Projeto importado.");
  } catch (error) {
    toast(error.message);
  } finally {
    e.target.value = "";
  }
};
$("print").onclick = () => window.print();
$("help").onclick = () => $("guide").showModal();
$("closeHelp").onclick = () => $("guide").close();
window.addEventListener("keydown", (e) => {
  if (
    e.target.closest("input,select,textarea") ||
    document.querySelector("dialog[open]")
  )
    return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    (e.shiftKey ? $("redo") : $("undo")).click();
  } else if (e.key === "Escape" || e.key.toLowerCase() === "v")
    setTool("select");
  else if (e.key === "Delete" && selected)
    change(() => {
      removeItem(project, selected);
      selected = null;
    });
});
render();

function uniqueName(base) {
  if (!project.items.some((i) => i.label === base)) return base;
  let n = 2;
  while (project.items.some((i) => i.label === `${base} ${n}`)) n++;
  return `${base} ${n}`.slice(0, 100);
}
function renderTemplates() {
  $("remoteTemplates").innerHTML = availableTemplates
    .map(
      (row) =>
        `<button data-template="${escape(row.slug)}" title="${escape(row.description)}">${escape(row.title)} <span>↗</span></button>`,
    )
    .join("");
}
$("remoteTemplates").onclick = (e) => {
  const slug = e.target.closest("[data-template]")?.dataset.template;
  const row = availableTemplates.find((row) => row.slug === slug);
  if (row)
    try {
      beginProject(structuredClone(row.project));
    } catch (error) {
      toast(error.message);
    }
};
renderTemplates();
fetchTemplates()
  .then((rows) => {
    if (!rows.length) throw new Error("Biblioteca vazia.");
    availableTemplates = rows;
    renderTemplates();
    $("databaseStatus").textContent = "Modelos conectados ao Supabase";
  })
  .catch(() => {
    $("databaseStatus").textContent = "Modelos locais · banco indisponível";
  });
$("newType").innerHTML = Object.entries(catalog)
  .map(([type, s]) => `<option value="${type}">${s.name}</option>`)
  .join("");
function setItemDefaults() {
  const s = catalog[$("newType").value];
  $("newLabel").value = uniqueName(s.name);
  $("newWidth").value = s.w;
  $("newHeight").value = s.h;
  $("newColor").value = s.color;
}
$("newType").onchange = setItemDefaults;
$("addItemButton").onclick = () => {
  setItemDefaults();
  $("itemDialog").showModal();
};
$("itemForm").onsubmit = (e) => {
  e.preventDefault();
  if (project.items.length >= 500) {
    toast("Limite de 500 componentes.");
    return;
  }
  const view = $("canvas").viewBox.baseVal;
  change(() => {
    const item = component(
      $("newType").value,
      Math.min(2000, snap(view.x + view.width / 2)),
      Math.min(1400, snap(view.y + view.height / 2)),
      $("newLabel").value.trim() || catalog[$("newType").value].name,
    );
    item.w = Number($("newWidth").value);
    item.h = Number($("newHeight").value);
    item.color = $("newColor").value;
    project.items.push(item);
    selected = item.id;
  });
  setTool("select");
  $("itemDialog").close();
  toast("Item adicionado. Edite suas propriedades no painel.");
};
$("detailsButton").onclick = () => {
  $("detailsName").value = project.name;
  $("detailsAuthor").value = project.author || "";
  $("detailsClient").value = project.client || "";
  $("detailsNotes").value = project.notes || "";
  $("projectDialog").showModal();
};
$("projectForm").onsubmit = (e) => {
  e.preventDefault();
  change(() => {
    project.name = $("detailsName").value.trim() || "Novo projeto";
    project.author = $("detailsAuthor").value.trim();
    project.client = $("detailsClient").value.trim();
    project.notes = $("detailsNotes").value.trim();
  });
  $("projectDialog").close();
  toast("Dados do projeto atualizados.");
};
function renderProjectList() {
  $("projectsList").innerHTML = workspace
    ? workspace
        .list()
        .map(
          (record) =>
            `<button class="list-item" data-project="${record.id}">${escape(record.name)} ${record.id === workspace.state.active ? "· aberto" : ""}<small>${escape(new Date(record.updatedAt).toLocaleString("pt-BR"))}</small></button>`,
        )
        .join("")
    : "<p>Salvamento local indisponível. Exporte JSON.</p>";
}
$("projectsButton").onclick = () => {
  renderProjectList();
  $("projectsDialog").showModal();
};
$("projectsList").onclick = (e) => {
  const id = e.target.closest("[data-project]")?.dataset.project;
  if (!id || !workspace) return;
  try {
    workspace.save(project);
    project = workspace.open(id);
    selected = null;
    running = false;
    history.past = [];
    history.future = [];
    setTool("select");
    render();
    $("projectsDialog").close();
  } catch (error) {
    toast(error.message);
  }
};
$("copyProject").onclick = () => {
  try {
    const copy = structuredClone(project);
    copy.name = (copy.name + " · cópia").slice(0, 160);
    beginProject(copy);
    renderProjectList();
  } catch (error) {
    toast(error.message);
  }
};
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => $(b.dataset.close).close()));
for (const format of ["Pdf", "Pptx"])
  $("export" + format).onclick = async () => {
    const button = $("export" + format),
      label = button.textContent;
    button.disabled = true;
    button.textContent = "Gerando…";
    try {
      await exportReport(
        format.toLowerCase(),
        structuredClone(project),
        $("canvas"),
        running,
      );
      toast("Arquivo gerado. Confira os downloads do navegador.");
    } catch (error) {
      toast(error.message || "Falha ao exportar. Tente novamente.");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  };
