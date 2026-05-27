/**
 * Vérifie que l'API est joignable avant les tests E2E.
 * En local : `docker compose up -d postgres && docker compose up backend`
 */
export default async function globalSetup(): Promise<void> {
  const backendBase = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8080';
  const healthUrl = `${backendBase.replace(/\/$/, '')}/actuator/health`;
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // API pas encore prête
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(
    `Backend indisponible (${healthUrl}). ` +
      'Démarrez PostgreSQL + API : docker compose up -d postgres && docker compose up backend',
  );
}
