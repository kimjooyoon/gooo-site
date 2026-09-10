import {readFile, readdir, mkdir, copyFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const started = performance.now();
const pages = (await readdir('.')).filter(name => name.endsWith('.html')).sort();
const documents = new Map(await Promise.all(pages.map(async name => [name, await readFile(name, 'utf8')])));
let links = 0;
for (const [name, html] of documents) {
  for (const required of ['<!doctype html>', 'name="viewport"', '<title>', '<main', 'id="main"', 'lang="en"']) {
    if (!html.toLowerCase().includes(required.toLowerCase())) throw new Error(`${name}: missing ${required}`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (ids.length !== new Set(ids).size) throw new Error(`${name}: duplicate IDs`);
  for (const [, href] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (/^(https:|mailto:)/.test(href)) continue;
    const [file, fragment] = href.split('#');
    const target = file || name;
    if (resolve(target).indexOf(resolve('.') + '/') !== 0) throw new Error(`unsafe local target: ${href}`);
    const content = documents.get(target) ?? await readFile(target, 'utf8');
    if (fragment && !content.includes(`id="${fragment}"`)) throw new Error(`${name}: missing anchor ${href}`);
    links++;
  }
}
await mkdir('dist', {recursive:true});
const files = [...pages, 'style.css', 'astryx.mjs', 'relay-request.mjs'];
const digests = {};
let bytes = 0;
for (const file of files) {
  const data = await readFile(file);
  bytes += data.byteLength;
  digests[file] = createHash('sha256').update(data).digest('hex');
  await copyFile(file, `dist/${file}`);
}
const report = {schema:'gooo-site/build-receipt/v1', head:process.env.GITHUB_SHA ?? 'UNOBSERVED', html_pages:pages.length, local_links_checked:links, first_party_asset_bytes:bytes, wall_ms:Math.round(performance.now()-started), max_rss_kib:process.resourceUsage().maxRSS, local_test_executions:0, compiler_invocations:0, digests, scope:'STATIC_STRUCTURE_AND_LOCAL_LINKS_ONLY', visual_accessibility_audit:'UNASSESSED', external_CDN_availability:'UNASSESSED'};
await writeFile('dist/build-receipt.json', JSON.stringify(report, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `## Website receipt\n\nHTML pages: ${pages.length}\n\nLocal links: ${links}\n\nFirst-party bytes: ${bytes}\n\nBuild/check time: ${report.wall_ms} ms\n\nPeak RSS: ${report.max_rss_kib} KiB\n\nScope: static structure and local links only. External CDN payloads are not included.\n`);
console.log(JSON.stringify(report));
