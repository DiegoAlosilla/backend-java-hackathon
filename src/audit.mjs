import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {hash, sourcePath} from './io.js';
import {discover} from './discovery.js';

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function validateAudit(repo, audit) {
  requireValue(audit.version === 1, 'Versión de auditoría no soportada.');
  requireValue(nonempty(audit.service), 'service es requerido.');
  requireValue(Array.isArray(audit.endpoints) && audit.endpoints.length > 0, 'endpoints debe contener al menos una entrada.');
  const inventory = await discover(repo);
  requireValue(audit.repositoryFingerprint === inventory.fingerprint, 'Inventario obsoleto. Repite discover y revisa la auditoría.');
  const contents = new Map();
  async function source(file, expectedHash) {
    requireValue(nonempty(file) && /^[a-f0-9]{64}$/.test(expectedHash ?? ''), 'Fuente requiere file y sha256.');
    if (!contents.has(file)) contents.set(file, await readFile(await sourcePath(repo, file), 'utf8'));
    const content = contents.get(file);
    requireValue(hash(content) === expectedHash, `Evidencia obsoleta: ${file}`);
    return content;
  }
  async function evidence(entries, label) {
    requireValue(Array.isArray(entries) && entries.length > 0, `Falta evidencia: ${label}`);
    for (const item of entries) {
      const content = await source(item.file, item.sha256);
      const lines = content.split(/\r?\n/);
      requireValue(Number.isInteger(item.startLine) && Number.isInteger(item.endLine) && item.startLine > 0 && item.endLine >= item.startLine && item.endLine <= lines.length, `Intervalo inválido: ${item.file}`);
      requireValue(nonempty(item.quote) && nonempty(item.claim), 'Evidencia requiere quote y claim.');
      requireValue(lines.slice(item.startLine - 1, item.endLine).join('\n').includes(item.quote.replaceAll('\r\n', '\n')), `Cita inexistente: ${item.file}:${item.startLine}`);
    }
  }
  const revisions = new Map();
  const endpoints = [];
  const endpointIds = new Set();
  const routes = new Set();
  for (const endpoint of audit.endpoints) {
    requireValue(nonempty(endpoint.id) && /^[a-zA-Z][\w-]*$/.test(endpoint.id) && !endpointIds.has(endpoint.id), 'ID de endpoint inválido o duplicado.');
    endpointIds.add(endpoint.id);
    const routeKey = `${endpoint.method} ${endpoint.path}`;
    requireValue(!routes.has(routeKey), `Endpoint duplicado: ${routeKey}`);
    routes.add(routeKey);
    const entry = inventory.entries.find(item => item.kind === 'http' && item.method === endpoint.method && item.route === endpoint.path);
    requireValue(entry, `Endpoint fuera del inventario: ${routeKey}`);
    await evidence(endpoint.evidence, endpoint.id);
    requireValue(endpoint.evidence.some(item => entry.handlerCandidates.some(handler => handler.file === item.file && item.startLine <= handler.endLine && item.endLine >= handler.startLine)), `Falta evidencia del handler Java: ${endpoint.id}`);
    requireValue(endpoint.contract && nonempty(endpoint.contract.file), 'Contrato requerido.');
    const snapshot = await source(endpoint.contract.file, endpoint.contract.sha256);
    const {revision, operationRef} = await contractSnapshot(endpoint.contract.file, snapshot, endpoint.method, endpoint.path);
    revisions.set(`${revision.apiId}:${revision.revisionId}`, revision);
    requireValue(Array.isArray(endpoint.dependencies) && Array.isArray(endpoint.steps) && Array.isArray(endpoint.findings), 'dependencies, steps y findings deben ser arrays.');
    const ids = new Set([endpoint.id]);
    for (const dep of endpoint.dependencies) {
      requireValue(nonempty(dep.id) && /^[a-zA-Z][\w-]*$/.test(dep.id) && !ids.has(dep.id), 'ID de dependencia inválido o duplicado.');
      ids.add(dep.id);
      requireValue(nonempty(dep.label) && ['api', 'cache', 'database', 'event', 'service'].includes(dep.kind), 'Dependencia requiere label y kind soportado.');
      await evidence(dep.evidence, dep.id);
    }
    for (const step of endpoint.steps) {
      requireValue(ids.has(step.from) && ids.has(step.to) && step.from !== step.to, 'Paso apunta a figura inexistente o a sí misma.');
      requireValue(['request', 'response'].includes(step.direction) && nonempty(step.label), 'Paso requiere direction y label.');
      await evidence(step.evidence, step.label);
    }
    for (const finding of endpoint.findings) {
      requireValue(['info', 'warning', 'error'].includes(finding.severity) && nonempty(finding.claim), 'Hallazgo requiere severity y claim.');
      await evidence(finding.evidence, finding.claim);
    }
    endpoints.push({...endpoint, operationRef});
  }
  // Detect edits while validating. The output describes exactly these source bytes.
  for (const [file, content] of contents) {
    requireValue(hash(await readFile(await sourcePath(repo, file), 'utf8')) === hash(content), `Fuente cambió durante validación: ${file}`);
  }
  return {...audit, endpoints, registry: {version: 2, revisions: [...revisions.values()]}, git: inventory.git, limitations: inventory.limitations};
}

export async function contractSnapshot(file, snapshot, method, route) {
  let readContract;
  try { ({readContract} = await import('../editor/dist/contracts-core.mjs')); }
  catch { throw new Error('Prepara el núcleo de contratos: npm --prefix editor run build'); }
  const sha256 = hash(snapshot);
  const revision = {apiId: `api-${hash(file).slice(0, 16)}`, revisionId: `sha256:${sha256}`, sha256, format: path.extname(file).toLowerCase() === '.json' ? 'json' : 'yaml', snapshot};
  const operation = readContract(revision).operations.find(item => item.ref.method.toUpperCase() === method && item.ref.path === route);
  requireValue(operation, `Operación ausente en contrato: ${method} ${route}`);
  return {revision, operationRef: operation.ref};
}

const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;').replaceAll('\n', '&#10;').replaceAll('\r', '&#13;');
const attr = values => Object.entries(values).map(([key, value]) => `${key}="${xml(typeof value === 'object' ? JSON.stringify(value) : value)}"`).join(' ');

function componentPorts(steps, positions) {
  const links = new Map();
  for (const step of steps) {
    const pair = [step.from, step.to].sort().join(':');
    if (!links.has(pair)) links.set(pair, []);
    links.get(pair).push(step);
  }
  return steps.map(step => {
    const pair = links.get([step.from, step.to].sort().join(':'));
    const slot = (pair.indexOf(step) + 1) / (pair.length + 1);
    const [fromX, fromY] = positions[step.from];
    const [toX, toY] = positions[step.to];
    if (fromX === toX) return fromY < toY ? [slot, 1, slot, 0] : [slot, 0, slot, 1];
    return fromX < toX ? [1, slot, 0, slot] : [0, slot, 1, slot];
  });
}

export function renderDrawio(audit, {layout, type = 'components'} = {}) {
  const sequence = type === 'sequence';
  const pages = audit.endpoints.map(endpoint => {
    const flow = {version: 1, steps: endpoint.steps.map((step, i) => ({cellId: step.to, edgeId: `__audit_edge_${i}`, direction: step.direction, label: step.label}))};
    function vertex(id, label, x, y, fill, metadata = {}, shape = 'rounded=1') {
      const height = sequence ? 110 + endpoint.steps.length * 48 : 100;
      const style = sequence ? 'shape=umlLifeline;size=56' : shape;
      return `<object ${attr({id, label, ...metadata})}><mxCell vertex="1" parent="1" style="${style};whiteSpace=wrap;html=0;fillColor=${fill};strokeColor=#64748b;fontSize=14;"><mxGeometry x="${x}" y="${y}" width="${layout?.nodeWidth ?? 200}" height="${height}" as="geometry"/></mxCell></object>`;
    }
    const sourceMetadata = item => audit.design
      ? {designDecisions: item.decisions ?? [], ...item.metadata}
      : {auditEvidence: {version: 1, entries: item.evidence, revision: audit.git.revision, fingerprint: audit.repositoryFingerprint}};
    const endpointLabel = endpoint.label ?? `${endpoint.title || audit.service}\n${endpoint.method} ${endpoint.path}`;
    const binding = item => item.operationRef ? {contractRef: item.operationRef, contractState: 'linked'} : {};
    const endpointMetadata = {...binding(endpoint), ...sourceMetadata(endpoint), auditFlow: flow};
    const components = {
      api: ['#f1f5f9', 'rounded=1'], service: ['#dbeafe', 'shape=component'],
      cache: ['#fee2e2', 'shape=cylinder3;size=15'], database: ['#dcfce7', 'shape=cylinder3;size=15'],
      event: ['#f3e8ff', 'rounded=1']
    };
    const positions = {[endpoint.id]: [80, 100]};
    endpoint.dependencies.forEach((dep, i) => {
      positions[dep.id] = sequence ? [80 + (i + 1) * 245, 100] : [460 + (i % 2) * 350, 100 + Math.floor(i / 2) * 200];
    });
    Object.assign(positions, layout?.positionsByPage?.[endpoint.id] ?? layout?.positions);
    const portsByStep = sequence ? endpoint.steps.map((_, i) => {
      const y = (100 + i * 48) / (110 + endpoint.steps.length * 48);
      return [0.5, y, 0.5, y];
    }) : layout?.ports ?? componentPorts(endpoint.steps, positions);
    const cells = [vertex(endpoint.id, endpointLabel, ...positions[endpoint.id], '#dae8fc', endpointMetadata, 'shape=component')];
    endpoint.dependencies.forEach((dep, i) => {
      const [fill, shape] = components[dep.kind];
      cells.push(vertex(dep.id, dep.label, ...positions[dep.id], dep.pending ? '#fff2cc' : fill, {...binding(dep), ...sourceMetadata(dep)}, shape));
    });
    endpoint.steps.forEach((step, i) => {
      const response = step.direction === 'response';
      const [exitX, exitY, entryX, entryY] = portsByStep[i];
      const ports = `exitX=${exitX};exitY=${exitY};entryX=${entryX};entryY=${entryY};`;
      const label = `${i + 1}. ${step.label}`;
      const labelOffset = layout?.labelOffsets?.[i];
      const offset = labelOffset ? `<mxPoint x="${labelOffset[0]}" y="${labelOffset[1]}" as="offset"/>` : '';
      const routing = sequence ? 'exitPerimeter=0;entryPerimeter=0;' : 'edgeStyle=orthogonalEdgeStyle;rounded=1;';
      cells.push(`<object ${attr({id: `__audit_edge_${i}`, label, ...sourceMetadata(step)})}><mxCell edge="1" parent="1" source="${xml(step.from)}" target="${xml(step.to)}" style="${routing}html=0;endArrow=block;labelBackgroundColor=#ffffff;${ports}strokeColor=${response ? '#15803d' : '#2563eb'};${response ? 'dashed=1;' : ''}"><mxGeometry relative="1" as="geometry">${offset}</mxGeometry></mxCell></object>`);
    });
    const bottom = sequence ? 250 + endpoint.steps.length * 48 : Math.max(...Object.values(positions).map(([, y]) => y)) + 160;
    endpoint.findings.forEach((finding, i) => cells.push(vertex(`__audit_finding_${i}`, `${finding.severity.toUpperCase()}\n${finding.claim}`, 80 + (i % 3) * 340, bottom + Math.floor(i / 3) * 140, '#fff2cc', sourceMetadata(finding))));
    if (!layout) cells.push(vertex('__audit_scope', 'Análisis estático con evidencia de código.\nLa animación explica pasos descritos en la auditoría.', 80, bottom + Math.ceil(endpoint.findings.length / 3) * 140, '#f5f5f5'));
    return `<diagram ${attr({id: endpoint.id, name: endpoint.pageName ?? `${endpoint.method} ${endpoint.path}`})}><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile ${attr({host: 'Backend Copilot', contractsRegistry: audit.registry})}>${pages.join('')}</mxfile>\n`;
}
