import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (existsSync(".env")) process.loadEnvFile(".env");

const connection = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connection) throw new Error("Configura DATABASE_URL y, para Neon, DIRECT_URL antes de desplegar.");

const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: connection },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
