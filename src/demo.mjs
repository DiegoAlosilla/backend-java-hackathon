import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {hash} from './io.js';
import {discover} from './discovery.js';

export async function demoAudit(repo) {
  const inventory = await discover(repo);
  async function citation(file, quote, claim) {
    const content = await readFile(path.join(repo, file), 'utf8');
    const startLine = content.split(/\r?\n/).findIndex(line => line.includes(quote)) + 1;
    if (!startLine) throw new Error(`Fixture cambió: ${quote}`);
    return {file, startLine, endLine: startLine, quote, claim, sha256: hash(content)};
  }
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
