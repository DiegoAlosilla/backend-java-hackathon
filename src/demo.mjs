import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {hash} from './io.js';
import {discover} from './discovery.js';

function citationsFrom(repo) {
  return async (file, quote, claim) => {
    const content = await readFile(path.join(repo, file), 'utf8');
    const startLine = content.split(/\r?\n/).findIndex(line => line.includes(quote)) + 1;
    if (!startLine) throw new Error(`Fixture cambió: ${quote}`);
    return {file, startLine, endLine: startLine, quote, claim, sha256: hash(content)};
  };
}

export async function demoAudit(repo) {
  const inventory = await discover(repo);
  const citation = citationsFrom(repo);
  const resourceFile = 'src/main/java/demo/AccountsResource.java';
  const serviceFile = 'src/main/java/demo/AccountService.java';
  const contractFile = 'src/main/resources/META-INF/openapi.yaml';
  const handler = await citation(resourceFile, 'public Response balance', 'El handler expone la consulta de saldo.');
  const call = await citation(resourceFile, 'service.statusForBalance(balance)', 'El handler delega la elección del estado HTTP a AccountService.');
  const absence = await citation(serviceFile, 'return 204;', 'El servicio devuelve 204 en la rama de ausencia.');
  const response = await citation(resourceFile, 'Response.noContent().build()', 'El handler construye la respuesta de ausencia sin cuerpo.');
  const contractEvidence = await citation(contractFile, "'204':", 'El contrato declara respuesta 204.');
  return {
    version: 1,
    service: 'Cuenta ficticia',
    repositoryFingerprint: inventory.fingerprint,
    endpoints: [{
      id: 'balance', method: 'GET', path: '/accounts/{id}/balance', title: 'Consultar saldo',
      contract: {file: contractFile, sha256: hash(await readFile(path.join(repo, contractFile), 'utf8'))},
      evidence: [handler, call, response],
      dependencies: [{id: 'account-service', label: 'AccountService.statusForBalance', kind: 'service', evidence: [call, absence]}],
      steps: [
        {from: 'balance', to: 'account-service', direction: 'request', label: 'Consultar estado para saldo', evidence: [call]},
        {from: 'account-service', to: 'balance', direction: 'response', label: 'Ausencia → HTTP 204', evidence: [absence, response]}
      ],
      findings: [{severity: 'info', claim: 'La rama de ausencia devuelve 204 y construye una respuesta sin cuerpo.', evidence: [absence, response, contractEvidence]}]
    }]
  };
}

export const overviewLayout = {
  positions: {
    client: [25, 220], overview: [330, 220], balances: [655, 220], database: [955, 220],
    redis: [330, 30], topic: [330, 425]
  },
  ports: [
    [1, 0.27, 0, 0.27], [0.18, 0, 0.18, 1], [0.50, 1, 0.50, 0],
    [1, 0.27, 0, 0.27], [1, 0.27, 0, 0.27], [0, 0.73, 1, 0.73],
    [0, 0.73, 1, 0.73], [0.5, 1, 0.5, 0], [0.82, 0, 0.82, 1], [0, 0.73, 1, 0.73]
  ],
  labelOffsets: {1: [0, -28], 8: [0, 28]}
};

export async function demoOverviewAudit(repo) {
  const inventory = await discover(repo);
  const resource = 'src/main/java/demo/AccountOverviewResource.java';
  const flow = 'src/main/java/demo/AccountOverviewFlow.java';
  const balance = 'src/main/java/demo/BalanceService.java';
  const contract = 'src/main/resources/META-INF/openapi.yaml';
  const cite = citationsFrom(repo);
  const handler = await cite(resource, 'public Response overview', 'El microservicio de cuentas recibe la consulta HTTP.');
  const read = await cite(flow, 'cache.get(key)', 'El flujo lee la clave de la cuenta en caché.');
  const miss = await cite(flow, 'if (cached != null)', 'Con caché presente se devuelve el dato. El recorrido mostrado corresponde a una clave ausente.');
  const call = await cite(flow, 'balanceClient.apply(id)', 'Ante una clave ausente, Cuentas llama al microservicio de Saldos.');
  const query = await cite(balance, 'repository.applyAsInt(id)', 'Saldos consulta el repositorio que representa la base de datos y devuelve el saldo.');
  const publish = await cite(flow, 'publisher.publish("account.overview.loaded"', 'Cuentas publica el evento account.overview.loaded después de recibir el saldo.');
  const write = await cite(flow, 'cache.put(key, balance, 300)', 'Cuentas guarda o actualiza la clave en Redis con TTL de 300 segundos antes de responder.');
  const response = await cite(resource, 'Response.ok(flow.overview(id))', 'Cuentas construye la respuesta HTTP 200 después de que finaliza el flujo.');
  const legs = [
    ['client', 'overview', 'request', 'GET /overview', handler],
    ['overview', 'redis', 'request', 'GET clave', read],
    ['redis', 'overview', 'response', 'Clave ausente', miss],
    ['overview', 'balances', 'request', 'Consultar saldo', call],
    ['balances', 'database', 'request', 'Leer saldo', query],
    ['database', 'balances', 'response', 'Saldo', query],
    ['balances', 'overview', 'response', 'Saldo', call],
    ['overview', 'topic', 'request', 'Publicar evento', publish],
    ['overview', 'redis', 'request', 'SET · TTL 300 s', write],
    ['overview', 'client', 'response', 'HTTP 200 · saldo', response]
  ];
  return {
    version: 1,
    service: 'Cuentas',
    repositoryFingerprint: inventory.fingerprint,
    endpoints: [{
      id: 'overview', method: 'GET', path: '/accounts/{id}/overview', title: 'Cuentas',
      contract: {file: contract, sha256: hash(await readFile(path.join(repo, contract), 'utf8'))},
      evidence: [handler, read, miss, call, publish, write, response],
      dependencies: [
        {id: 'client', label: 'Cliente HTTP', kind: 'api', evidence: [handler, response]},
        {id: 'redis', label: 'Redis', kind: 'cache', evidence: [read, write]},
        {id: 'balances', label: 'MS Saldos', kind: 'service', evidence: [call, query]},
        {id: 'database', label: 'Base de datos', kind: 'database', evidence: [query]},
        {id: 'topic', label: 'Kafka\naccount.overview.loaded', kind: 'event', evidence: [publish]}
      ],
      steps: legs.map(([from, to, direction, label, source]) => ({from, to, direction, label, evidence: [source]})),
      findings: []
    }]
  };
}
