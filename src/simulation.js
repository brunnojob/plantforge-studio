export function simulate(project) {
  const states = Object.fromEntries(
    project.items.map((i) => [i.id, i.enabled]),
  );
  const events = [];
  const decisions = new Map();
  for (const rule of project.rules) {
    const source = project.items.find((i) => i.id === rule.source);
    const target = project.items.find((i) => i.id === rule.target);
    if (!source || !target || !source.enabled) continue;
    const triggered =
      rule.operator === ">"
        ? source.value > rule.threshold
        : rule.operator === "<"
          ? source.value < rule.threshold
          : source.value === rule.threshold;
    if (!triggered) continue;
    const state = rule.action === "on";
    if (decisions.has(target.id) && decisions.get(target.id) !== state)
      events.push({
        level: "conflict",
        message: `Conflito em ${target.label}: desligamento tem prioridade.`,
      });
    decisions.set(
      target.id,
      decisions.has(target.id) ? decisions.get(target.id) && state : state,
    );
    events.push({
      level: "rule",
      message: `${source.label} (${source.value}) → ${target.label}: ${state ? "ligar" : "desligar"}`,
    });
  }
  for (const [id, state] of decisions) states[id] = state;
  return {
    states,
    events,
    active: Object.values(states).filter(Boolean).length,
  };
}
