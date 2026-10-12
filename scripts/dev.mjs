/**
 * Safe `npm run dev`.
 *
 * Two dev servers writing into the same `.next` folder corrupt each other's build
 * (pages return 500 "Expected clientReferenceManifest", styles vanish). This wrapper:
 *   - reuses the running server: if the port is already taken it prints the URL and exits;
 *   - gives any server on a port other than 3000 its own build folder (.next-dev-<port>).
 *
 * Usage: npm run dev                 → http://localhost:3000 (build folder .next)
 *        npm run dev -- -p 3001      → http://localhost:3001 (build folder .next-dev-3001)
 */
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const portFlag = args.findIndex(a => a === '-p' || a === '--port');
const port = Number(portFlag >= 0 ? args[portFlag + 1] : process.env.PORT ?? 3000);

function portInUse(p) {
  return new Promise(resolve => {
    const socket = net.connect({ port: p, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

if (await portInUse(port)) {
  console.log(`\nA dev server is already running at http://localhost:${port}. Reuse it.`);
  console.log('Starting a second one on the same build folder corrupts .next (see AGENTS.md rule 5).');
  console.log(`Need a separate server? Run: npm run dev -- -p ${port + 1}\n`);
  process.exit(0);
}

const env = { ...process.env };
if (port !== 3000 && !env.NEXT_DIST_DIR) env.NEXT_DIST_DIR = `.next-dev-${port}`;

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(port), ...args.filter((_, i) => i !== portFlag && i !== portFlag + 1)], {
  stdio: 'inherit',
  env,
});
child.on('exit', code => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
