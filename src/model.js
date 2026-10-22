export const catalog = {
  wall: { name: 'Parede', icon: '▰', color: '#8494a7', w: 240, h: 12, group: 'Estrutura' },
  zone: { name: 'Área / sala', icon: '▧', color: '#54718c', w: 240, h: 180, group: 'Estrutura' },
  door: { name: 'Porta', icon: '◴', color: '#c6aa78', w: 70, h: 20, group: 'Estrutura' },
  pump: { name: 'Bomba', icon: '◉', color: '#38d7c0', w: 70, h: 60, group: 'Offshore' },
  tank: { name: 'Tanque', icon: '▤', color: '#63b5ff', w: 100, h: 100, group: 'Offshore' },
  valve: { name: 'Válvula', icon: '⋈', color: '#c7a4ff', w: 50, h: 50, group: 'Offshore' },
  generator: { name: 'Gerador', icon: 'ϟ', color: '#f5c16c', w: 100, h: 70, group: 'Offshore' },
  gas: { name: 'Sensor de gás', icon: '◇', color: '#f08d9e', w: 50, h: 50, group: 'Sensores' },
  temperature: { name: 'Temperatura', icon: '°', color: '#ffb17a', w: 50, h: 50, group: 'Sensores' },
  presence: { name: 'Presença', icon: '◎', color: '#a2a9ff', w: 50, h: 50, group: 'Sensores' },
  alarm: { name: 'Alarme', icon: '△', color: '#ff788b', w: 50, h: 50, group: 'Automação' },
  light: { name: 'Luminária', icon: '☼', color: '#f7dc8a', w: 50, h: 50, group: 'Automação' },
  gate: { name: 'Acesso', icon: '⇥', color: '#8ee1ba', w: 80, h: 35, group: 'Comércio' },
  shelf: { name: 'Gôndola', icon: '▥', color: '#7eb5cc', w: 130, h: 60, group: 'Comércio' },
  checkout: { name: 'Self-checkout', icon: '▣', color: '#b2a0f7', w: 70, h: 65, group: 'Comércio' },
  fridge: { name: 'Refrigerador', icon: '❄', color: '#9bd7ee', w: 100, h: 65, group: 'Comércio' }
};
export const uid = () => crypto.randomUUID();
export const snap = value => Math.round(value / 10) * 10;
export function component(type, x, y, label) {
  const spec = catalog[type];
  return { id: uid(), type, x, y, w: spec.w, h: spec.h, rotation: 0, label: label || spec.name, value: 0, enabled: true };
}
export function template(kind = 'offshore') {
  const offshore = kind === 'offshore';
  const items = offshore ? [component('zone',100,100,'DECK DE PROCESSO'),component('tank',160,190,'TQ-101'),component('pump',350,210,'P-101'),component('valve',500,215,'XV-101'),component('gas',350,110,'GD-101'),component('alarm',620,120,'AL-101'),component('generator',620,300,'GE-101')] : [component('zone',100,100,'MERCADO AUTÔNOMO'),component('gate',160,420,'ACESSO'),component('presence',180,330,'PRESENÇA'),component('shelf',300,200,'GÔNDOLA A'),component('shelf',300,320,'GÔNDOLA B'),component('fridge',520,150,'FRIO-01'),component('temperature',650,160,'TT-01'),component('alarm',650,270,'AL-01'),component('checkout',540,390,'CAIXA'),component('light',380,110,'LUZ')];
  items[0].w=650; items[0].h=420;
  const find = type => items.find(i => i.type === type).id;
  return { version: 1, name: offshore ? 'Unidade offshore · Deck A' : 'Mercado autônomo · Loja 01', items, connections: offshore ? [{id:uid(),from:find('tank'),to:find('pump')},{id:uid(),from:find('pump'),to:find('valve')}] : [], rules: offshore ? [{id:uid(),source:find('gas'),operator:'>',threshold:30,target:find('alarm'),action:'on'},{id:uid(),source:find('gas'),operator:'>',threshold:30,target:find('pump'),action:'off'}] : [{id:uid(),source:find('temperature'),operator:'>',threshold:8,target:find('alarm'),action:'on'},{id:uid(),source:find('presence'),operator:'>',threshold:0,target:find('light'),action:'on'}] };
}
export function validateProject(data) {
  if (!data || data.version !== 1 || typeof data.name !== 'string' || data.name.length > 160 || !Array.isArray(data.items) || data.items.length > 500 || !Array.isArray(data.connections) || data.connections.length > 1000 || !Array.isArray(data.rules) || data.rules.length > 1000) throw new Error('Arquivo de projeto inválido ou acima do limite.');
  const ids = new Set();
  for (const item of data.items) {
    if (!catalog[item.type] || typeof item.id !== 'string' || ids.has(item.id) || typeof item.label !== 'string' || item.label.length > 100 || typeof item.enabled !== 'boolean' || !['x','y','w','h','rotation','value'].every(k => Number.isFinite(item[k])) || item.x < 0 || item.y < 0 || item.x > 2000 || item.y > 1400 || item.w < 10 || item.h < 10 || item.w > 1500 || item.h > 1000 || Math.abs(item.value)>100000 || Math.abs(item.rotation)>360) throw new Error('Componente inválido.');
    ids.add(item.id);
  }
  for (const edge of data.connections) if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from===edge.to || typeof edge.id !== 'string') throw new Error('Conexão inválida.');
  for (const rule of data.rules) if (!ids.has(rule.source) || !ids.has(rule.target) || !['>','<','=='].includes(rule.operator) || !['on','off'].includes(rule.action) || !Number.isFinite(rule.threshold) || typeof rule.id !== 'string') throw new Error('Regra inválida.');
  return structuredClone(data);
}
export function removeItem(project, id) {
  project.items = project.items.filter(i=>i.id!==id);
  project.connections = project.connections.filter(c=>c.from!==id && c.to!==id);
  project.rules = project.rules.filter(r=>r.source!==id && r.target!==id);
}
export class History {
  past=[]; future=[];
  push(project) { this.past.push(structuredClone(project)); if(this.past.length>60)this.past.shift(); this.future=[]; }
  undo(project) { if(!this.past.length)return project; this.future.push(structuredClone(project)); return this.past.pop(); }
  redo(project) { if(!this.future.length)return project; this.past.push(structuredClone(project)); return this.future.pop(); }
}
