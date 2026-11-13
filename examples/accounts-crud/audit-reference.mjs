import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {discover} from '../../src/discovery.js';
import {hash, projectRoot, writeJson} from '../../src/io.js';

const repo = path.dirname(fileURLToPath(import.meta.url));
const inventory = await discover(repo);
const contractFile = 'src/main/resources/META-INF/openapi.yaml';
const contract = {file: contractFile, sha256: hash(await readFile(path.join(repo, contractFile), 'utf8'))};

async function cite(className, quote, claim) {
  const file = `src/main/java/demo/crud/${className}.java`;
  const content = await readFile(path.join(repo, file), 'utf8');
  const line = content.split(/\r?\n/).findIndex(text => text.includes(quote)) + 1;
  if (!line) throw new Error(`Referencia desactualizada: ${file}, ${quote}`);
  return {file, startLine: line, endLine: line, quote, claim, sha256: hash(content)};
}

const register = await cite('AccountsResource', 'public Response register(', 'El recurso recibe POST /accounts.');
const insert = await cite('AccountService', 'database.insert(account)', 'El registro empieza en la base de datos simulada. Un identificador duplicado detiene el flujo.');
const accountCache = await cite('AccountService', 'redis.setAccount(account)', 'El servicio guarda la cuenta en la caché después de persistirla.');
const invalidate = await cite('AccountService', 'redis.invalidateList()', 'El registro invalida la lista cacheada para que la siguiente consulta incluya la nueva cuenta.');
const publish = await cite('AccountService', 'topic.publish("accounts.registered"', 'El servicio publica en el tópico local accounts.registered.');
const created = await cite('AccountsResource', 'Response.status(201)', 'El recurso devuelve la cuenta con HTTP 201 después de que termina el registro.');
const list = await cite('AccountsResource', 'public List<Account> list()', 'El recurso recibe GET /accounts y devuelve la lista como JSON.');
const lookup = await cite('AccountService', 'redis.getList()', 'El listado consulta primero la caché de la lista.');
const hit = await cite('AccountService', 'return cached.get()', 'Si hay una lista en caché se devuelve directamente, incluso cuando está vacía.');
const read = await cite('AccountService', 'database.selectAll()', 'Cuando la lista falta en caché, el servicio consulta la base de datos.');
const fill = await cite('AccountService', 'redis.setList(accounts)', 'El servicio guarda la lista obtenida en la caché antes de devolverla.');

const client = {id: 'client', label: 'Cliente HTTP', kind: 'api', evidence: [register, list]};
const redis = {id: 'redis', label: 'Redis simulado', kind: 'cache', evidence: [accountCache, invalidate, lookup, fill]};
const database = {id: 'database', label: 'BD simulada', kind: 'database', evidence: [insert, read]};
const topic = {id: 'topic', label: 'Tópico local\naccounts.registered', kind: 'event', evidence: [publish]};

function operation(id, method, title, evidence, dependencies, interactions) {
  const steps = interactions.map(([from, to, direction, label, source]) => ({from, to, direction, label, evidence: [source]}));
  return {id, method, title, path: '/accounts', contract, evidence, dependencies, steps, findings: []};
}

const registration = operation('register', 'POST', 'Cuentas · registrar', [register, created], [client, database, redis, topic], [
  ['client', 'register', 'request', 'POST /accounts', register],
  ['register', 'database', 'request', 'Insertar cuenta', insert],
  ['database', 'register', 'response', 'Cuenta persistida', insert],
  ['register', 'redis', 'request', 'Guardar cuenta', accountCache],
  ['register', 'redis', 'request', 'Invalidar lista', invalidate],
  ['register', 'topic', 'request', 'Publicar registro', publish],
  ['register', 'client', 'response', 'HTTP 201 · cuenta', created]
]);
const cacheMiss = operation('list-miss', 'GET', 'Cuentas · listar · caché vacía', [list, lookup, read, fill], [client, redis, database], [
  ['client', 'list-miss', 'request', 'GET /accounts', list],
  ['list-miss', 'redis', 'request', 'Consultar lista', lookup],
  ['redis', 'list-miss', 'response', 'Lista ausente', lookup],
  ['list-miss', 'database', 'request', 'Consultar cuentas', read],
  ['database', 'list-miss', 'response', 'Lista de cuentas', read],
  ['list-miss', 'redis', 'request', 'Guardar lista', fill],
  ['list-miss', 'client', 'response', 'HTTP 200 · lista', list]
]);
const cacheHit = operation('list-hit', 'GET', 'Cuentas · listar · caché presente', [list, lookup, hit], [client, redis], [
  ['client', 'list-hit', 'request', 'GET /accounts', list],
  ['list-hit', 'redis', 'request', 'Consultar lista', lookup],
  ['redis', 'list-hit', 'response', 'Lista en caché', hit],
  ['list-hit', 'client', 'response', 'HTTP 200 · lista', list]
]);

const output = path.join(projectRoot, 'runs/accounts-crud');
const audit = {version: 1, service: 'Cuentas CRUD', repositoryFingerprint: inventory.fingerprint};
await writeJson(path.join(output, 'audit.json'), {...audit, endpoints: [registration, cacheMiss]});
await writeJson(path.join(output, 'audit-cache-hit.json'), {...audit, endpoints: [cacheHit]});
console.log(`Auditorías de referencia guardadas en ${output}`);
