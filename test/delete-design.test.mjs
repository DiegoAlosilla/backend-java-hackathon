import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parse} from 'yaml';
import {designDelete} from '../src/delete-design.mjs';
import {projectRoot} from '../src/io.js';

const repo = path.join(projectRoot, 'examples/accounts-crud');
const answers = {missingStatus: 404, validateId: true, databaseFirst: true, topic: 'accounts.deleted'};

test('el diseño DELETE genera spec, contrato y recorridos según las respuestas', async t => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'delete-design-'));
  t.after(() => rm(out, {recursive: true, force: true}));
  const source = path.join(repo, 'src/main/resources/META-INF/openapi.yaml');
  const before = await readFile(source, 'utf8');
  for (const [missingStatus, validateId, statuses, pages] of [[404, true, ['204', '400', '404'], 3], [204, false, ['204'], 2]]) {
    const result = await designDelete(repo, {...answers, missingStatus, validateId}, out);
    const proposed = parse(await readFile(path.join(out, 'openapi.proposed.yaml'), 'utf8'));
    assert.deepEqual(proposed.paths['/accounts'], parse(before).paths['/accounts']);
    const operation = proposed.paths['/accounts/{id}'].delete;
    assert.deepEqual(Object.keys(operation.responses).sort(), statuses);
    assert.equal(operation.responses['204'].content, undefined);
    assert.equal(Boolean(operation.parameters[0].schema.pattern), validateId);
    assert.match(await readFile(path.join(out, 'spec.md'), 'utf8'), /AC-05/);
    assert.equal((result.content.match(/<diagram /g) ?? []).length, pages);
    assert.match(result.content, /shape=component/);
    assert.match(result.content, /designDecisions=/);
    assert.doesNotMatch(result.content, /auditEvidence=/);
  }
  assert.equal(await readFile(source, 'utf8'), before);
});

test('el diseño exige decisiones completas y escribe fuera del servicio', async () => {
  await assert.rejects(designDelete(repo, {...answers, topic: undefined}, repo), /Confirma/);
  await assert.rejects(designDelete(repo, answers, path.join(repo, 'target/proposal')), /fuera del microservicio/);
});
