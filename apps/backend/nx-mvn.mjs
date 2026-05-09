#!/usr/bin/env node
/**
 * Runs the Maven wrapper from apps/backend on Windows or Unix so Nx targets work everywhere.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';
const wrapper = isWin ? '.\\mvnw.cmd' : './mvnw';
const args = process.argv.slice(2);

const result = spawnSync(wrapper, args, {
  cwd: backendRoot,
  stdio: 'inherit',
  shell: isWin,
  env: process.env,
});

process.exit(result.status ?? 1);
