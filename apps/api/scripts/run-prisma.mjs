import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const rootEnvPath = resolve(process.cwd(), "../../.env");

if (existsSync(rootEnvPath)) {
  const contents = readFileSync(rootEnvPath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const prismaCommand =
  process.platform === "win32"
    ? resolve(process.cwd(), "node_modules/.bin/prisma.CMD")
    : resolve(process.cwd(), "node_modules/.bin/prisma");
const command = process.platform === "win32" ? "cmd.exe" : prismaCommand;
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", prismaCommand, ...process.argv.slice(2)]
    : process.argv.slice(2);

const child = spawn(command, args, {
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
