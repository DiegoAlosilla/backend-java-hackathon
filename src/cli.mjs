import {parseArgs} from 'node:util';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {discover} from './discovery.js';
import {writeJson, atomicWrite, projectRoot} from './io.js';
import {validateAudit, renderDrawio} from './audit.mjs';
import {openLocal} from './delivery.js';
import {demoAudit} from './demo.mjs';

try {
  const {positionals, values} = parseArgs({allowPositionals: true, options: {repo: {type: 'string'}, input: {type: 'string'}, out: {type: 'string'}, open: {type: 'boolean'}, 'editor-url': {type: 'string'}}});
  const command = positionals[0];
  if (positionals.length !== 1) throw new Error('Uso: node src/cli.mjs discover|render|demo [opciones]');
  const repo = values.repo || (command === 'demo' ? path.join(projectRoot, 'examples/account-service') : undefined);
  if (!repo) throw new Error('--repo es requerido.');
  if (command === 'discover') {
    const inventory = await discover(repo);
    if (values.out) await writeJson(path.resolve(values.out), inventory);
    else process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  } else if (command === 'render' || command === 'demo') {
    const out = values.out || (command === 'demo' ? path.join(projectRoot, 'runs/demo/account.drawio') : undefined);
    if (!out) throw new Error('--out es requerido.');
    if (command === 'render' && !values.input) throw new Error('--input es requerido.');
    const audit = command === 'demo' ? await demoAudit(repo) : JSON.parse(await readFile(values.input, 'utf8'));
    const checked = await validateAudit(repo, audit);
    const content = renderDrawio(checked);
    await atomicWrite(path.resolve(out), content);
    if (command === 'demo') await writeJson(path.join(path.dirname(path.resolve(out)), 'audit.json'), audit);
    process.stdout.write(`${JSON.stringify({status: 'validated', output: path.resolve(out), endpoints: checked.endpoints.length, scope: 'static-source-evidence'})}\n`);
    if (values.open) await openLocal(content, {url: values['editor-url'], log: console.error});
  } else throw new Error(`Comando desconocido: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
