// Vérification statique autonome : aucune connexion Discord ni écriture de données.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const full = path.join(dir, e.name);
  return e.isDirectory() ? files(full) : e.name.endsWith('.js') ? [full] : [];
}); }
const js = [...files(path.join(root, 'src')), path.join(root, 'deploy-commands.js'), path.join(root, 'deploy-nuke.js')];
let failed = 0;
for (const file of js) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { failed++; console.error(path.relative(root, file), result.stderr); }
}
const config = path.join(root, 'src', 'config', 'servers.json');
try { JSON.parse(fs.readFileSync(config, 'utf8')); } catch (error) { failed++; console.error('Configuration JSON:', error.message); }
console.log(`PRIMEBOT • ${js.length} fichiers JS contrôlés • ${failed} erreur(s)`);
process.exitCode = failed ? 1 : 0;
