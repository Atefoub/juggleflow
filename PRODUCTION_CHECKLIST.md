## JuggleFlow — Production checklist (RNCP6)

Cette checklist vise un déploiement **sécurisé**, **reproductible** et **opérable** (2026).

### Build & release

- **Backend image immutable** : construire/pousser une image versionnée (tag semver + SHA).
  - Source: `apps/backend/Dockerfile` / `apps/backend/Containerfile`
- **Aucun montage de code en prod** (pas de `spring-boot:run` en volume).
  - Exemple “prod-like”: `compose.prod.yml`

### Secrets & configuration (obligatoires)

- **JWT_SECRET** : valeur aléatoire forte (≥ 64 chars recommandés).
- **POSTGRES_PASSWORD** : secret fort.
- **CORS_ALLOWED_ORIGINS** : liste explicite (pas de `*`) du/des domaines frontend.
- **COOKIE_SECURE=true** (HTTPS obligatoire).
- **APP_TRUSTED_PROXY** :
  - `true` uniquement si le trafic passe par un reverse proxy/ingress de confiance.
  - `false` sinon (XFF forgeable).

### Stores distribués (multi-instances)

- **Redis requis en prod** (révocation JWT + rate limiting):
  - `APP_JWT_REVOCATION_STORE=redis`
  - `APP_RATE_LIMIT_STORE=redis`
- Vérifier la connectivité Redis (réseau, auth, TLS si nécessaire).

### Démo / Swagger (doivent être OFF)

- `DEMO_BOOTSTRAP_ENABLED=false`
- `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` : vides après init
- `SWAGGER_ENABLED=false` et `SWAGGER_PUBLIC=false`
- `APP_PUBLIC_REGISTRATION_ENABLED=false` (inscription publique désactivée ; comptes créés par l'admin)

> Le backend fail-fast en profil `prod` si une option dangereuse est activée.

### Reverse proxy / HTTPS

- Terminer TLS au niveau ingress/proxy (ou en frontal).
- Forcer redirection HTTP→HTTPS côté proxy si possible.
- Vérifier les en-têtes forward (selon infra):
  - `X-Forwarded-For`, `X-Forwarded-Proto`
- Si `APP_TRUSTED_PROXY=true`, le backend utilise la **dernière** entrée de `X-Forwarded-For`.

### Données & RGPD

- **Backups Postgres** : planifier dumps/snapshots + restauration testée.
- Définir une **politique de rétention** (audit, consentements, exports).
- S’assurer que les exports RGPD (CSV/PDF) sont accessibles uniquement aux rôles autorisés.

### Observabilité minimale

- Activer la collecte logs (stdout) + rotation au niveau plateforme.
- Monitorer au minimum:
  - **/actuator/health**
  - taux 4xx/5xx
  - latence P95/P99
  - saturation rate limiting (429) sur `/api/auth/login`, `register`, `refresh`, `forgot-password`

### Vérifications avant mise en prod

- CI vert (lint/test/build + E2E + scans sécurité).
- Test “prod-like” local:
  - `compose.prod.yml` démarre correctement
  - login/refresh/logout OK
- Test multi-instances (2 pods) :
  - révocation refresh persistante
  - rate limiting non contournable par round-robin

