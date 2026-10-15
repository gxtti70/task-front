import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const sourceRoot = join(process.cwd(), 'src');
const files = [];
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (/\.(ts|html)$/.test(entry.name)) files.push(path);
  }
}

collect(sourceRoot);
const failures = [];
for (const path of files) {
  const source = readFileSync(path, 'utf8');
  if (path.endsWith('.html') && source.includes('$any(')) failures.push(`${path}: remove the Angular $any() escape`);
  if (source.includes('ui-avatars.com')) failures.push(`${path}: use local avatar rendering`);
  if (path.endsWith('.ts')) {
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    const visit = node => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) failures.push(`${path}: explicit any type at line ${ast.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
}

const appConfig = readFileSync(join(sourceRoot, 'app/app.config.ts'), 'utf8');
const picked = appConfig.match(/LucideAngularModule\.pick\(\{([\s\S]*?)\}\)/)?.[1] ?? '';
const registered = new Set([...picked.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/g)].map(([, name]) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([a-z])([0-9])/g, '$1-$2').toLowerCase()));
const used = new Set();
for (const path of files.filter(path => path.endsWith('.html') || path.endsWith('.ts'))) {
  const source = readFileSync(path, 'utf8');
  for (const [tag] of source.matchAll(/<lucide-icon\b[^>]*>/gs)) {
    const staticName = tag.match(/\bname=["']([a-z0-9-]+)["']/)?.[1];
    if (staticName) used.add(staticName);
    const expression = tag.match(/\[name\]="([^"]+)"|\[name\]='([^']+)'/)?.slice(1).find(Boolean) ?? '';
    for (const [, icon] of expression.matchAll(/["']([a-z0-9-]+)["']/g)) used.add(icon);
  }
}
for (const icon of used) if (!registered.has(icon)) failures.push(`Lucide icon "${icon}" is used but missing from LucideAngularModule.pick()`);
for (const icon of registered) if (!used.has(icon)) failures.push(`Lucide icon "${icon}" is registered but unused`);

if (failures.length) {
  console.error(failures.map(failure => `✖ ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Static guards passed (${files.length} source files checked).`);
}
