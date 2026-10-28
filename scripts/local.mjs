import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const envPath = resolve(root, ".env");
const username = userInfo().username;
if (!existsSync(envPath)) {
  writeFileSync(envPath, `DATABASE_URL="postgresql://${username}@127.0.0.1:55432/patamatch?schema=public"\nBETTER_AUTH_URL="http://localhost:3000"\nBETTER_AUTH_SECRET="${randomBytes(32).toString("hex")}"\n`, { mode: 0o600 });
}
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^([A-Z_]+)=["']?(.*?)["']?$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env, ...options });
  if (result.error || result.status !== 0) {
    console.error(`No se pudo completar: ${command} ${args.join(" ")}`);
    if (result.error) console.error(result.error.message);
    process.exit(1);
  }
}
const localDir = resolve(root, ".local");
const databaseDir = resolve(localDir, "postgres");
mkdirSync(localDir, { recursive: true });
const usesPrivateDatabase = process.env.DATABASE_URL.includes("127.0.0.1:55432");
let startedDatabase = false;
if (usesPrivateDatabase) {
  if (!existsSync(resolve(databaseDir, "PG_VERSION"))) {
    console.log("Preparando PostgreSQL local de PataMatch…");
    run("initdb", ["-D", databaseDir, "-A", "trust", "--encoding=UTF8", "--locale=C.UTF-8"]);
  }
  const status = spawnSync("pg_isready", ["-h", "127.0.0.1", "-p", "55432", "-U", username, "-d", "postgres"], { stdio: "ignore" });
  if (status.status !== 0) {
    run("pg_ctl", ["-D", databaseDir, "-l", resolve(localDir, "postgres.log"), "-o", "-h 127.0.0.1 -p 55432 -k /tmp", "-w", "start"]);
    startedDatabase = true;
  }
  const databaseExists = spawnSync("psql", ["-h", "127.0.0.1", "-p", "55432", "-U", username, "-d", "postgres", "-tAc", "SELECT 1 FROM pg_database WHERE datname = 'patamatch'"], { encoding: "utf8" });
  if (databaseExists.status !== 0) throw new Error("No se pudo conectar con PostgreSQL local.");
  if (databaseExists.stdout.trim() !== "1") run("createdb", ["-h", "127.0.0.1", "-p", "55432", "-U", username, "patamatch"]);
}
run("npm", ["run", "db:generate"]);
run("npm", ["run", "db:push"]);
run("npm", ["run", "db:seed"]);
if (process.argv.includes("--setup-only")) process.exit(0);
const production = existsSync(resolve(root, ".next/BUILD_ID"));
console.log("\nPataMatch está iniciando en http://localhost:3000\n");
const server = spawn("npm", ["run", production ? "start" : "dev"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", code => {
  if (startedDatabase) spawnSync("pg_ctl", ["-D", databaseDir, "-m", "fast", "-w", "stop"], { stdio: "inherit" });
  process.exit(code ?? 0);
});
