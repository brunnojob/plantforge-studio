import { template, validateProject, component } from "./model.js";
import { database } from "./config.js";
export const builtInTemplates = [
  {
    slug: "offshore",
    title: "Plataforma offshore",
    description:
      "Deck de processo, sensor de gás e intertravamento conceitual.",
    project: template("offshore"),
  },
  {
    slug: "retail",
    title: "Mercado autônomo",
    description: "Acesso, refrigeração, presença e iluminação.",
    project: template("retail"),
  },
];
export async function fetchTemplates(fetcher = fetch) {
  const response = await fetcher(
    `${database.url}/rest/v1/plantforge_templates?select=slug,title,description,project&published=eq.true&order=title&limit=20`,
    {
      headers: { apikey: database.publishableKey },
      signal: AbortSignal.timeout(6000),
    },
  );
  if (!response.ok) throw new Error("Biblioteca remota indisponível.");
  const data = await response.json();
  if (!Array.isArray(data) || data.length > 20)
    throw new Error("Biblioteca remota inválida.");
  return data.map((row) => {
    if (
      typeof row.slug !== "string" ||
      !/^[a-z0-9-]{1,60}$/.test(row.slug) ||
      typeof row.title !== "string" ||
      row.title.length > 160 ||
      typeof row.description !== "string" ||
      row.description.length > 400
    )
      throw new Error("Modelo inválido.");
    return { ...row, project: validateProject(row.project) };
  });
}
const electrical = template("offshore");
electrical.name = "Sala elétrica · Distribuição";
electrical.items = electrical.items.filter((i) =>
  ["zone", "generator"].includes(i.type),
);
electrical.items.push(
  component("panel", 350, 200, "QD-01"),
  component("battery", 500, 210, "UPS-01"),
  component("light", 350, 340, "LUZ-01"),
);
electrical.connections = [];
electrical.rules = [];
const commerce = template("retail");
commerce.name = "Comércio · Loja e estoque";
builtInTemplates.push(
  {
    slug: "electrical",
    title: "Sala elétrica",
    description: "Distribuição conceitual com gerador, quadro e UPS.",
    project: electrical,
  },
  {
    slug: "commerce",
    title: "Loja e estoque",
    description: "Gôndolas, acesso e refrigeração para comércio.",
    project: commerce,
  },
);
