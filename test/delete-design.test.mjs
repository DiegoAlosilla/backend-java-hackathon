import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parse} from 'yaml';
import {designDelete} from '../src/delete-design.mjs';
import {estimateDelete} from '../src/delete-estimate.mjs';
import {projectRoot} from '../src/io.js';

const repo = path.join(projectRoot, 'examples/accounts-crud');
const answers = {missingStatus: 404, validateId: true, databaseFirst: true, topic: 'accounts.deleted'};

test('el diseño DELETE genera spec, contrato y recorridos según las respuestas', async t => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'delete-design-'));
  t.after(() => rm(out, {recursive: true, force: true}));
  const source = path.join(repo, 'src/main/resources/META-INF/openapi.yaml');
  const before = await readFile(source, 'utf8');
  for (const [missingStatus, validateId, statuses, pages, effort] of [[404, true, ['204', '400', '404'], 3, 16.5], [204, false, ['204'], 2, 14]]) {
    const result = await designDelete(repo, {...answers, missingStatus, validateId}, out);
    const proposed = parse(await readFile(path.join(out, 'openapi.proposed.yaml'), 'utf8'));
    assert.deepEqual(proposed.paths['/accounts'], parse(before).paths['/accounts']);
    const operation = proposed.paths['/accounts/{id}'].delete;
    assert.deepEqual(Object.keys(operation.responses).sort(), statuses);
    assert.equal(operation.responses['204'].content, undefined);
    assert.equal(Boolean(operation.parameters[0].schema.pattern), validateId);
    const spec = await readFile(path.join(out, 'spec.md'), 'utf8');
    assert.match(spec, /AC-05/);
    const estimate = estimateDelete(spec, 2, 7);
    assert.equal(estimate.results[1].effort, effort);
    assert.equal(estimate.results[1].developers, validateId ? 3 : 1);
    if (validateId) {
      assert.deepEqual(estimate.results[1].elapsed, [16.5, 14.5, 13.5]);
      assert.equal(estimateDelete(spec, 2, 7.25).results[1].developers, 2);
    }
    assert.equal(estimate.results[2].developers, null);
    assert.equal(estimateDelete(spec, 1, 6).results[1].developers, null);
    assert.throws(() => estimateDelete(spec, 0, 7), /días hábiles/);
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
