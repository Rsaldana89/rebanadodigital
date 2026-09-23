const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const appManifest = JSON.parse(read('public/manifest.webmanifest'));
const screenManifest = JSON.parse(read('public/manifest-pantalla.webmanifest'));

function pngDimensions(relative) {
  const data = fs.readFileSync(path.join(root, relative));
  assert.strictEqual(data.toString('hex', 0, 8), '89504e470d0a1a0a');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

assert.strictEqual(appManifest.id, '/rebanado-digital');
assert.strictEqual(appManifest.start_url, '/login?source=pwa');
assert.strictEqual(appManifest.scope, '/');
assert.strictEqual(appManifest.display, 'standalone');
assert.strictEqual(screenManifest.id, '/pantalla');
assert.strictEqual(screenManifest.start_url, '/pantalla?source=pwa');
assert.strictEqual(screenManifest.scope, '/pantalla');
assert.strictEqual(screenManifest.display, 'standalone');
assert.strictEqual(screenManifest.orientation, 'landscape');

for (const manifest of [appManifest, screenManifest]) {
  assert(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose.includes('maskable')));
  assert(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose.includes('maskable')));
}

assert.deepStrictEqual(pngDimensions('public/icons/rebanado-app-192.png'), { width: 192, height: 192 });
assert.deepStrictEqual(pngDimensions('public/icons/rebanado-app-512.png'), { width: 512, height: 512 });
assert.deepStrictEqual(pngDimensions('public/icons/rebanado-pantalla-192.png'), { width: 192, height: 192 });
assert.deepStrictEqual(pngDimensions('public/icons/rebanado-pantalla-512.png'), { width: 512, height: 512 });

const loginView = read('views/login.ejs');
const headerView = read('views/partials/header.ejs');
const footerView = read('views/partials/footer.ejs');
const screenView = read('views/pantalla.ejs');
const installer = read('public/js/pwa-install.js');

assert(loginView.includes('href="/manifest.webmanifest"'));
assert(loginView.includes('data-pwa-install'));
assert(headerView.includes('href="/manifest.webmanifest"'));
assert(headerView.includes('data-pwa-worker="/sw.js"'));
assert(footerView.includes('/js/pwa-install.js'));
assert(screenView.includes('href="/manifest-pantalla.webmanifest"'));
assert(screenView.includes('data-pwa-worker="/sw-pantalla.js"'));
assert(screenView.includes('Instalar pantalla'));
assert(installer.includes('beforeinstallprompt'));
assert(installer.includes('navigator.serviceWorker.register'));
assert(fs.existsSync(path.join(root, 'public/sw.js')));
assert(fs.existsSync(path.join(root, 'public/sw-pantalla.js')));
assert(fs.existsSync(path.join(root, 'public/offline.html')));
assert(fs.existsSync(path.join(root, 'public/offline-pantalla.html')));

console.log('Pruebas de instalación PWA principal y Pantalla almacén: OK');
