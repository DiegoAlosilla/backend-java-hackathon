import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, cp, readFile, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateAudit, renderDrawio} from '../src/audit.mjs';
import {demoAudit} from '../src/demo.mjs';
import {discover, javaInventory} from '../src/discovery.js';
import {projectRoot, hash} from '../src/io.js';

async function fixture(t) {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'backend-audit-'));
  t.after(() => rm(repo, {recursive: true, force: true}));
  await cp(path.join(projectRoot, 'examples/account-service'), repo, {recursive: true, filter: source => !source.split(path.sep).includes('target')});
  return {repo, audit: await demoAudit(repo)};
}

test('demo genera XML nativo con contrato, evidencia, animación y contenido escapado', async t => {
  const {repo, audit} = await fixture(t);
  audit.endpoints[0].title = '<script>alert("x")</script>';
  const checked = await validateAudit(repo, audit);
  const output = renderDrawio(checked);
  assert.match(output, /contractsRegistry=/);
  assert.match(output, /contractRef=/);
  assert.match(output, /auditEvidence=/);
  assert.match(output, /auditFlow=/);
  assert.match(output, /&lt;script&gt;/);
  assert.doesNotMatch(output, /<script>/);
  assert.match(output, /id="__audit_edge_0"/);
  assert.match(output, /shape=component/);
  assert.doesNotMatch(output, /shape=umlLifeline/);
  assert.match(renderDrawio(checked, {type: 'sequence'}), /shape=umlLifeline/);
  assert.equal(checked.registry.revisions.length, 1);
});

test('rechaza inventario obsoleto y evidencia cuyo hash no coincide', async t => {
  const {repo, audit} = await fixture(t);
  const invalid = structuredClone(audit);
  invalid.endpoints[0].evidence[0].sha256 = '0'.repeat(64);
  await assert.rejects(validateAudit(repo, invalid), /Evidencia obsoleta/);
  await writeFile(path.join(repo, 'pom.xml'), '<project/>');
  await assert.rejects(validateAudit(repo, audit), /Inventario obsoleto/);
});

test('rechaza citas falsas, fuentes fuera del repositorio y pasos rotos', async t => {
  const {repo, audit} = await fixture(t);
  for (const [modify, error] of [
    [item => item.endpoints[0].evidence[0].quote = 'inexistent statement', /Cita inexistente/],
    [item => item.endpoints[0].evidence[0].file = '../outside.java', /ENOENT|sale del repositorio/],
    [item => item.endpoints[0].steps[0].to = 'missing', /figura inexistente/],
    [item => item.endpoints[0].method = 'POST', /fuera del inventario/],
    [item => item.endpoints[0].id = '__audit_edge_0', /ID de endpoint inválido/]
  ]) {
    const invalid = structuredClone(audit);
    modify(invalid);
    await assert.rejects(validateAudit(repo, invalid), error);
  }
});

test('preserva identidad de contratos con bytes iguales en archivos distintos', async t => {
  const {repo, audit} = await fixture(t);
  const originalFile = audit.endpoints[0].contract.file;
  const snapshot = await readFile(path.join(repo, originalFile), 'utf8');
  const extended = snapshot + '\n  /accounts/health:\n    get:\n      responses:\n        "204":\n          description: Healthy\n';
  const secondContract = 'src/main/resources/META-INF/second.yaml';
  await writeFile(path.join(repo, originalFile), extended);
  await writeFile(path.join(repo, secondContract), extended);
  const javaFile = 'src/main/java/demo/AccountsResource.java';
  const java = await readFile(path.join(repo, javaFile), 'utf8');
  const changed = java.replace('    @GET', '    @GET\n    @Path("/health")\n    public Response health() { return Response.noContent().build(); }\n\n    @GET');
  await writeFile(path.join(repo, javaFile), changed);
  const current = await demoAudit(repo);
  const second = structuredClone(current.endpoints[0]);
  second.id = 'health'; second.path = '/accounts/health'; second.contract.file = secondContract;
  const line = changed.split(/\r?\n/).findIndex(item => item.includes('public Response health')) + 1;
  second.evidence = [{file: javaFile, sha256: hash(changed), startLine: line, endLine: line, quote: 'public Response health()', claim: 'Health handler.'}];
  second.dependencies = []; second.steps = []; second.findings = [];
  current.endpoints.push(second);
  const checked = await validateAudit(repo, current);
  assert.equal(checked.registry.revisions.length, 2);
  assert.notEqual(checked.registry.revisions[0].apiId, checked.registry.revisions[1].apiId);
  assert.equal(checked.registry.revisions[0].sha256, checked.registry.revisions[1].sha256);
});

test('descubrimiento CST evita comentarios, clientes y rutas dinámicas', () => {
  assert.equal(javaInventory('@Path("/api") class A { /* @POST */ @GET public String get(){ return "@DELETE";} }', 'A.java').entries.length, 1);
  assert.equal(javaInventory('@RegisterRestClient @Path("/api") interface A { @GET String get(); }', 'A.java').entries.length, 0);
  const data = javaInventory('@Path(ROOT) class A { @GET public String get(){return "x";} }', 'A.java');
  assert.equal(data.entries.length, 0);
  assert.ok(data.warnings.length);
});
