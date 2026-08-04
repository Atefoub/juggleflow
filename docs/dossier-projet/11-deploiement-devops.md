# 11 — Déploiement et démarche DevOps

**Compétences :** CP10 (préparer/documenter le déploiement), CP11 (contribuer à la mise en production / DevOps).  
**Sources :** `compose.prod.yml`, `k8s/`, `PRODUCTION_CHECKLIST.md`, workflows CI, README.

---

## 1. Stratégie globale

| Niveau | Outil | Rôle dans le projet |
|--------|-------|---------------------|
| Dev local | Podman Compose (`docker-compose.yml`) | Postgres + Redis + backend hot-reload Maven |
| Prod-like local | `compose.prod.yml` | Image backend immutable, profil `prod` |
| Cluster (artefacts) | Manifests `k8s/` | Point de départ Kubernetes documenté |
| Intégration continue | GitHub Actions | Build, tests, scans |
| Livraison continue | — | **Aucun workflow de déploiement automatique trouvé** |

---

## 2. Déploiement Compose prod-like

Fichier : `compose.prod.yml`.

Caractéristiques constatées :

- build depuis `apps/backend/Dockerfile` → tag `juggleflow-backend:${BACKEND_IMAGE_TAG:-local}` ;
- Postgres/Redis **sans** publication de ports hôte ;
- variables obligatoires : `POSTGRES_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` ;
- `COOKIE_SECURE`, trusted proxy, Redis stores, Swagger/démo/register public désactivés ;
- healthcheck HTTP `/actuator/health`.

```bash
podman compose -f compose.prod.yml up -d
```

Documentation associée : README § Mode prod-like + `PRODUCTION_CHECKLIST.md`.

---

## 3. Kubernetes (présent dans le dépôt — à traiter si besoin)

Dossier `k8s/` + `k8s/README.md` : **point de départ**, pas une plateforme prod certifiée.

| Fichier | Contenu |
|---------|---------|
| `00-namespace.yaml` | Namespace `juggleflow` |
| `01-secrets.example.yaml` | Exemple secrets opaque (placeholders) |
| `10-postgres.yaml` | StatefulSet Postgres 17, PVC 10 Gi, probes |
| `20-redis.yaml` | Deployment Redis 7.4 AOF, PVC 1 Gi |
| `30-backend.yaml` | Deployment **2 réplicas**, Service 8080, probes, resources |
| `40-ingress.yaml` | Ingress nginx exemple `api.juggleflow.example.fr` + TLS |
| `41-postgres-backup-cronjob.yaml` | `pg_dump` quotidien 02:00 UTC → PVC 5 Gi |

### Points factuels importants

1. Les workloads omettent souvent `metadata.namespace` → application via `kubectl -n juggleflow` (doc README k8s).
2. Image backend placeholder `juggleflow-backend:local` / `IfNotPresent`.
3. **Pas** de Deployment frontend dans `k8s/`.
4. CronJob backup attend `POSTGRES_USER` / `POSTGRES_DB` dans le secret, alors que l’exemple ne définit que `POSTGRES_PASSWORD` → **incohérence à corriger avant usage** (documentée par inspection).
5. Redis K8s : pas d’argument d’authentification configuré dans le manifeste inspecté.
6. Aucun workflow GitHub n’applique ces manifests (pas de CD).

### Formulation soutenance (honnête)

> Kubernetes est préparé sous forme de manifests versionnés (namespace, données, API multi-replicas, ingress TLS d’exemple, backup CronJob). L’environnement de démonstration et de travail quotidien reste Podman Compose. Il n’existe pas, dans le dépôt, de pipeline de déploiement automatique vers un cluster.

---

## 4. CI / automatisation

Voir aussi [10-qualite-tests-securite.md](./10-qualite-tests-securite.md).

Boucle DevOps actuelle :

```text
Push / PR → CI (lint, unit, build, E2E)
         → CodeQL / TruffleHog / Trivy / Dependency Review
         → (manuel) compose.prod ou kubectl apply
```

---

## 5. Checklist production (extrait thématique)

`PRODUCTION_CHECKLIST.md` exige notamment :

- images versionnées immutables ;
- secrets forts + CORS strict ;
- cookies Secure + Redis multi-instances ;
- démo / Swagger / register public off ;
- TLS / reverse proxy ;
- backups Postgres + tests de restauration ;
- monitoring health / erreurs / 429.

**Exécution réelle de chaque case :** `[À COMPLÉTER]` avec preuves (captures, tickets, dates).

---

## 6. Documentation de déploiement à fournir au jury

À assembler en annexe :

1. Procédure Podman dev (README)  
2. Procédure `compose.prod.yml`  
3. Procédure `k8s/README.md` (si présentée)  
4. Variables `.env.example` (sans secrets réels)  
5. Captures Podman Images / Containers / Volumes  
6. Captures GitHub Actions `[À COMPLÉTER]`  

---

## 7. Lien CP10 / CP11

| Exigence | Preuve projet |
|----------|---------------|
| Préparer le déploiement | Compose prod, Dockerfile backend, checklist |
| Documenter | README, `k8s/README.md`, ce chapitre |
| Démarche DevOps | CI, scans, healthchecks, multi-replicas K8s (artefact) |
| Mise en production | Manifests + checklist ; **prod live non affirmée** |
