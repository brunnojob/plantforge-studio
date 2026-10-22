import { uid, validateProject } from "./model.js";
export class ProjectStore {
  constructor(storage) {
    this.storage = storage;
    this.key = "plantforge.workspace.v2";
    this.state = { active: null, projects: {} };
    const raw = storage.getItem(this.key);
    if (raw) {
      const state = JSON.parse(raw);
      if (!state || typeof state.projects !== "object" || !state.projects)
        throw new Error("Lista de projetos inválida.");
      for (const [id, record] of Object.entries(state.projects)) {
        this.state.projects[id] = {
          ...record,
          project: validateProject(record.project),
        };
      }
      this.state.active = state.active;
    } else {
      const legacy = storage.getItem("plantforge.v1");
      if (legacy) this.create(validateProject(JSON.parse(legacy)));
    }
  }
  active() {
    return this.state.projects[this.state.active]?.project
      ? structuredClone(this.state.projects[this.state.active].project)
      : null;
  }
  list() {
    return Object.entries(this.state.projects)
      .map(([id, record]) => ({
        id,
        name: record.project.name,
        updatedAt: record.updatedAt,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  persist(next) {
    this.storage.setItem(this.key, JSON.stringify(next));
    this.state = next;
  }
  save(project) {
    if (!this.state.active) return this.create(project);
    const next = structuredClone(this.state);
    next.projects[next.active] = {
      project: validateProject(project),
      updatedAt: new Date().toISOString(),
    };
    this.persist(next);
  }
  create(project) {
    if (this.list().length >= 20)
      throw new Error(
        "Limite de 20 projetos locais. Exporte seus projetos para guardar cópias.",
      );
    const next = structuredClone(this.state),
      id = uid();
    next.active = id;
    next.projects[id] = {
      project: validateProject(project),
      updatedAt: new Date().toISOString(),
    };
    this.persist(next);
    return id;
  }
  open(id) {
    if (!Object.hasOwn(this.state.projects, id))
      throw new Error("Projeto não encontrado.");
    this.persist({ ...this.state, active: id });
    return this.active();
  }
}
