import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parse, stringify} from 'yaml';
import {atomicWrite, canonicalTarget, inside, lockRun, sourcePath, writeJson} from './io.js';
import {contractSnapshot, renderDrawio} from './audit.mjs';

const route = '/accounts/{id}';
const contractFile = 'src/main/resources/META-INF/openapi.yaml';

export function deleteDecisions(answers) {
  const {missingStatus, validateId, topic, databaseFirst} = answers ?? {};
  if (![204, 404].includes(missingStatus) || typeof validateId !== 'boolean' || databaseFirst !== true
      || typeof topic !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(topic)) {
    throw new Error('Confirma missingStatus (204 o 404), validateId (boolean), topic y databaseFirst (true).');
  }
  return {missingStatus, validateId, topic, databaseFirst};
}

export async function designDelete(repo, answers, out) {
  const decisionsInput = deleteDecisions(answers);
  const {missingStatus, validateId, topic} = decisionsInput;
  const root = await canonicalTarget(repo);
  const output = await canonicalTarget(out);
  if (inside(root, output)) throw new Error('Guarda los entregables del diseño fuera del microservicio.');
  const base = parse(await readFile(await sourcePath(root, contractFile), 'utf8'));
  if (base.paths?.[route]?.delete) throw new Error(`DELETE ${route} ya está en el contrato. Usa auditoría para revisar su implementación.`);

  const missing = missingStatus === 404 ? 'La cuenta ausente devuelve HTTP 404.' : 'La cuenta ausente devuelve HTTP 204 sin cuerpo.';
  const invalid = validateId ? 'Un ID fuera de [a-zA-Z0-9-]{1,32} devuelve HTTP 400.' : 'Se busca el ID recibido sin aplicar el patrón de alta.';
  const decisions = [
    {id: 'AC-01', text: 'La BD decide si existe la cuenta. Si existe, el servicio la borra en la BD, elimina su clave de Redis e invalida la lista.'},
    {id: 'AC-02', text: `Tras limpiar Redis, publica ${topic} con el ID y devuelve HTTP 204 sin cuerpo.`},
    {id: 'AC-03', text: `${missing} En ese caso no se modifica Redis ni se publica un evento.`},
    {id: 'AC-04', text: `${invalid} La validación, cuando se aplica, ocurre antes de consultar la BD.`},
    {id: 'AC-05', text: 'Tras borrar una cuenta, el próximo listado ya no la incluye.'}
  ];
  const error = description => ({description, content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}});
  const responses = {'204': {description: missingStatus === 204 ? 'Cuenta eliminada o ya ausente, sin cuerpo' : 'Cuenta eliminada, sin cuerpo'}};
  if (missingStatus === 404) responses['404'] = error('Cuenta inexistente');
  if (validateId) responses['400'] = error('Identificador inválido');
  base.paths[route] = {...base.paths[route], delete: {
    operationId: 'deleteAccount',
    summary: 'Eliminar una cuenta',
    description: decisions.map(({text}) => text).join(' '),
    parameters: [{name: 'id', in: 'path', required: true, schema: {type: 'string', ...(validateId ? {pattern: '^[a-zA-Z0-9-]{1,32}$'} : {})}}],
    responses
  }};

  const snapshot = stringify(base);
  const {revision, operationRef} = await contractSnapshot('openapi.proposed.yaml', snapshot, 'DELETE', route);
  const client = {id: 'client', label: 'Cliente HTTP', kind: 'api', decisions};
  const database = {id: 'database', label: 'BD simulada', kind: 'database', decisions: [decisions[0], decisions[2]]};
  const redis = {id: 'redis', label: 'Redis simulado', kind: 'cache', decisions: [decisions[0], decisions[4]]};
  const event = {id: 'topic', label: `Tópico local\n${topic}`, kind: 'event', decisions: [decisions[1]]};
  const page = (id, scenario, dependencies, interactions) => ({
    id, pageName: `Propuesta · ${scenario}`, title: `Propuesta · ${scenario}`, method: 'DELETE', path: route, operationRef, decisions, dependencies, findings: [],
    steps: interactions.map(([from, to, direction, label, decision]) => ({from, to, direction, label, decisions: [decisions[decision]]}))
  });
  const endpoints = [page('success', 'Cuenta existente', [client, database, redis, event], [
    ['client', 'success', 'request', 'Solicitar eliminación', 3],
    ['success', 'database', 'request', 'Eliminar por ID', 0],
    ['database', 'success', 'response', 'Cuenta eliminada', 0],
    ['success', 'redis', 'request', 'Borrar clave', 0],
    ['success', 'redis', 'request', 'Invalidar lista', 4],
    ['success', 'topic', 'request', 'Publicar evento', 1],
    ['success', 'client', 'response', 'HTTP 204 · sin cuerpo', 1]
  ]), page('missing', 'Cuenta ausente', [client, database], [
    ['client', 'missing', 'request', 'Solicitar eliminación', 3],
    ['missing', 'database', 'request', 'Eliminar por ID', 0],
    ['database', 'missing', 'response', 'Cuenta ausente', 2],
    ['missing', 'client', 'response', `HTTP ${missingStatus}`, 2]
  ])];
  if (validateId) endpoints.push(page('invalid', 'ID inválido', [client], [
    ['client', 'invalid', 'request', 'Solicitar eliminación', 3],
    ['invalid', 'client', 'response', 'HTTP 400', 3]
  ]));
  const content = renderDrawio({design: true, endpoints, registry: {version: 2, revisions: [revision]}}, {
    layout: {
      positions: {client: [30, 220], success: [390, 220], missing: [390, 220], invalid: [390, 220], database: [770, 220], redis: [390, 30], topic: [390, 410]},
      labelOffsets: {3: [0, -18], 4: [0, 18]}
    }
  });
  const spec = [
    '---', stringify({design: 'accounts-delete-v1', decisions: decisionsInput}).trimEnd(), '---', '',
    '# Propuesta de diseño · DELETE /accounts/{id}', '',
    'Estado: propuesta para revisión. Aplica al CRUD de cuentas con adaptadores locales.', '',
    '## Criterios de aceptación', '',
    ...decisions.map(({id, text}) => `- **${id}** ${text}`), '',
    '## Validación después de implementar', '',
    'Ejecutar las pruebas HTTP del CRUD. Registrar y listar una cuenta para poblar Redis. Eliminarla, comprobar el `204` sin cuerpo y volver a listar. Repetir el borrado con el resultado definido para una cuenta ausente. Verificar que se publica un solo evento y que el ID inválido se trata según AC-04.', ''
  ].join('\n');
  const release = await lockRun(output);
  try {
    await writeJson(path.join(output, 'decisions.json'), decisionsInput);
    await atomicWrite(path.join(output, 'spec.md'), spec);
    await atomicWrite(path.join(output, 'openapi.proposed.yaml'), snapshot);
    await atomicWrite(path.join(output, 'delete.proposed.drawio'), content);
  } finally {
    await release();
  }
  return {output, content};
}
