# Captures code — sécurité JuggleFlow

Images générées pour le dossier professionnel (RNCP 37873 — Concepteur développeur d’applications).

**Régénération :** `node scripts/generate-security-screenshots.mjs` (nécessite Playwright Chromium).

| Fichier | Élément de sécurité | Preuve pour le jury |
|---------|---------------------|---------------------|
| `spring-security-filter-chain.png` | Chaîne Spring Security stateless + ordre des filtres | API sans session serveur ; rate limit avant JWT |
| `http-security-headers-csp-hsts.png` | CSP, HSTS, X-Frame-Options, Referrer-Policy | Durcissement HTTP (OWASP / ANSSI) |
| `role-based-access-control.png` | RBAC par URL (`ROLE_ADMIN`, enseignant, authentifié) | Séparation des privilèges par rôle |
| `cors-strict-origins-no-wildcard.png` | CORS : origines explicites, pas de `*` | Protection cross-origin avec credentials |
| `bcrypt-password-encoding.png` | BCrypt force 12 | Mots de passe non stockés en clair |
| `jwt-filter-authentication.png` | Filtre JWT Bearer | Authentification stateless sur chaque requête |
| `jwt-utils-token-validation.png` | Émission / validation JWT, secret ≥ 32 car. | Tokens signés, typés access/refresh |
| `rate-limiting-filter.png` | Rate limiting login/register/refresh | Anti brute-force (429, Redis en prod) |
| `refresh-token-httponly-cookie.png` | Cookie httpOnly / Secure / SameSite | Refresh token inaccessible au JavaScript (XSS) |
| `auth-refresh-logout-cookie.png` | Endpoints refresh & logout | Rotation et révocation du refresh |
| `redis-jwt-revocation.png` | Blacklist JTI Redis (TTL) | Révocation distribuée multi-instances |
| `prod-fail-fast-safety-checks.png` | Garde-fous profil `prod` | Empêche déploiement avec réglages dev |
| `method-security-preauthorize.png` | `@PreAuthorize` au niveau contrôleur | Contrôle fin au-delà des URL |
| `gdpr-consent-endpoints.png` | API RGPD admin (`/api/admin/gdpr`) | Conformité mineurs / consentements |
| `test-redis-security-integration.png` | Tests Testcontainers Redis | Preuve automatisée révocation + rate limit |
| `test-jwt-utils.png` | Tests unitaires JWT | Validation des règles token |
| `test-rate-limit-429.png` | E2E Playwright HTTP 429 | Comportement observé en conditions réelles |
| `frontend-protected-routes-by-role.png` | `ProtectedRoute` React | Garde côté client complémentaire |
