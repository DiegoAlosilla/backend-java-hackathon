import {parseArgs} from 'node:util';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {discover} from './discovery.js';
import {writeJson, atomicWrite, projectRoot} from './io.js';
import {validateAudit, renderDrawio} from './audit.mjs';
import {openLocal} from './delivery.js';
import {demoAudit, demoOverviewAudit, overviewLayout} from './demo.mjs';

try {
  const {positionals, values} = parseArgs({allowPositionals: true, options: {repo: {type: 'string'}, input: {type: 'string'}, out: {type: 'string'}, open: {type: 'boolean'}, 'editor-url': {type: 'string'}}});
  const command = positionals[0];
  if (positionals.length !== 1) throw new Error('Uso: node src/cli.mjs discover|render|demo|demo-overview [opciones]');
  const overview = command === 'demo-overview';
  const demo = command === 'demo' || overview;
  const repo = values.repo || (demo ? path.join(projectRoot, 'examples/account-service') : undefined);
  if (!repo) throw new Error('--repo es requerido.');
  if (command === 'discover') {
    const inventory = await discover(repo);
    if (values.out) await writeJson(path.resolve(values.out), inventory);
    else process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  } else if (command === 'render' || demo) {
    const demoOutput = overview ? 'runs/overview/overview.drawio' : 'runs/demo/account.drawio';
    const out = values.out || (demo ? path.join(projectRoot, demoOutput) : undefined);
    if (!out) throw new Error('--out es requerido.');
    if (command === 'render' && !values.input) throw new Error('--input es requerido.');
    const audit = demo ? await (overview ? demoOverviewAudit : demoAudit)(repo) : JSON.parse(await readFile(values.input, 'utf8'));
    const checked = await validateAudit(repo, audit);
    const content = renderDrawio(checked, overview ? overviewLayout : undefined);
    await atomicWrite(path.resolve(out), content);
    if (demo) await writeJson(path.join(path.dirname(path.resolve(out)), 'audit.json'), audit);
    process.stdout.write(`${JSON.stringify({status: 'validated', output: path.resolve(out), endpoints: checked.endpoints.length, scope: 'static-source-evidence'})}\n`);
    if (values.open) await openLocal(content, {url: values['editor-url'], log: console.error});
  } else throw new Error(`Comando desconocido: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
