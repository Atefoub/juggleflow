/**
 * Génère des captures PNG du code sécurité (thème sombre) pour le dossier RNCP.
 * Usage: node scripts/generate-security-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots', 'security');
const TEMP_DIR = path.join(OUT_DIR, '.tmp-html');

/** @type {Array<{ name: string; file: string; start: number; end: number; lang: string }>} */
const SHOTS = [
  {
    name: 'spring-security-filter-chain',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/SecurityConfig.java',
    start: 82,
    end: 138,
    lang: 'java',
  },
  {
    name: 'http-security-headers-csp-hsts',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/SecurityConfig.java',
    start: 91,
    end: 117,
    lang: 'java',
  },
  {
    name: 'role-based-access-control',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/SecurityConfig.java',
    start: 119,
    end: 131,
    lang: 'java',
  },
  {
    name: 'cors-strict-origins-no-wildcard',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/SecurityConfig.java',
    start: 148,
    end: 169,
    lang: 'java',
  },
  {
    name: 'bcrypt-password-encoding',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/SecurityConfig.java',
    start: 193,
    end: 196,
    lang: 'java',
  },
  {
    name: 'jwt-filter-authentication',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/JwtFilter.java',
    start: 32,
    end: 75,
    lang: 'java',
  },
  {
    name: 'jwt-utils-token-validation',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/JwtUtils.java',
    start: 26,
    end: 92,
    lang: 'java',
  },
  {
    name: 'rate-limiting-filter',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/RateLimitFilter.java',
    start: 33,
    end: 150,
    lang: 'java',
  },
  {
    name: 'refresh-token-httponly-cookie',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/CookieUtils.java',
    start: 13,
    end: 93,
    lang: 'java',
  },
  {
    name: 'auth-refresh-logout-cookie',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/controller/AuthController.java',
    start: 84,
    end: 109,
    lang: 'java',
  },
  {
    name: 'redis-jwt-revocation',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/security/JwtUtils.java',
    start: 191,
    end: 228,
    lang: 'java',
  },
  {
    name: 'prod-fail-fast-safety-checks',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/config/ProdSafetyChecks.java',
    start: 10,
    end: 68,
    lang: 'java',
  },
  {
    name: 'method-security-preauthorize',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/controller/AdminPedagogicalResourceController.java',
    start: 1,
    end: 28,
    lang: 'java',
  },
  {
    name: 'gdpr-consent-endpoints',
    file: 'apps/backend/src/main/java/com/juggleflow/backend/controller/GdprController.java',
    start: 31,
    end: 75,
    lang: 'java',
  },
  {
    name: 'test-redis-security-integration',
    file: 'apps/backend/src/test/java/com/juggleflow/backend/security/RedisSecurityIntegrationTest.java',
    start: 32,
    end: 116,
    lang: 'java',
  },
  {
    name: 'test-jwt-utils',
    file: 'apps/backend/src/test/java/com/juggleflow/backend/security/JwtUtilsTest.java',
    start: 27,
    end: 58,
    lang: 'java',
  },
  {
    name: 'test-rate-limit-429',
    file: 'apps/frontend/e2e/z-rate-limit.spec.ts',
    start: 1,
    end: 41,
    lang: 'typescript',
  },
  {
    name: 'frontend-protected-routes-by-role',
    file: 'apps/frontend/src/router/AppRouter.tsx',
    start: 62,
    end: 115,
    lang: 'typescript',
  },
];

function readSlice(relFile, start, end) {
  const abs = path.join(ROOT, relFile);
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  const slice = lines.slice(start - 1, end);
  return slice.map((line, i) => ({
    num: start + i,
    text: line,
  }));
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(shot, rows) {
  const code = rows.map((r) => r.text).join('\n');
  const gutter = rows
    .map((r) => `<span class="ln">${String(r.num).padStart(4, ' ')}</span>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${shot.name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 32px 32px;
      background: #0d1117;
      font-family: 'Segoe UI', system-ui, sans-serif;
      min-width: 1200px;
    }
    .path {
      color: #8b949e;
      font-size: 14px;
      margin-bottom: 12px;
      font-family: Consolas, 'Cascadia Code', monospace;
    }
    .path strong { color: #58a6ff; font-weight: 600; }
    .frame {
      display: grid;
      grid-template-columns: auto 1fr;
      border: 1px solid #30363d;
      border-radius: 8px;
      overflow: hidden;
      background: #161b22;
    }
    .gutter {
      padding: 16px 12px 16px 16px;
      background: #0d1117;
      border-right: 1px solid #30363d;
      color: #6e7681;
      font-family: Consolas, 'Cascadia Code', monospace;
      font-size: 13px;
      line-height: 1.55;
      white-space: pre;
      user-select: none;
    }
    pre {
      margin: 0;
      padding: 16px 20px;
      overflow: visible;
    }
    pre code {
      font-family: Consolas, 'Cascadia Code', monospace;
      font-size: 13px;
      line-height: 1.55;
      background: transparent !important;
      padding: 0 !important;
    }
  </style>
</head>
<body>
  <div class="path"><strong>${escapeHtml(shot.file)}</strong> · lignes ${shot.start}–${shot.end}</div>
  <div class="frame">
    <div class="gutter">${gutter}</div>
    <pre><code class="language-${shot.lang}">${escapeHtml(code)}</code></pre>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/java.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
  <script>hljs.highlightAll();</script>
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  for (const shot of SHOTS) {
    const rows = readSlice(shot.file, shot.start, shot.end);
    const html = buildHtml(shot, rows);
    const htmlPath = path.join(TEMP_DIR, `${shot.name}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const body = page.locator('body');
    const outPath = path.join(OUT_DIR, `${shot.name}.png`);
    await body.screenshot({ path: outPath, type: 'png' });
    console.log(`✓ ${shot.name}.png`);
  }

  await browser.close();
  console.log(`\nDone: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
