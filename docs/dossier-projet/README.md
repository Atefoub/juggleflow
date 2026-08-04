# Dossier projet RNCP6 — JuggleFlow

**Titre du projet :** JuggleFlow — plateforme pédagogique PWA d’apprentissage du jonglage en contexte scolaire  
**Certification visée :** RNCP6 Concepteur développeur d’applications  
**Périmètre documenté :** état actuel du code du dépôt `juggleflow`  
**Date de génération de cette base :** 4 août 2026  

---

## Règle de rédaction

Ce dossier décrit **uniquement** ce qui est vérifiable dans :

| Source | Rôle |
|--------|------|
| Code (`apps/frontend`, `apps/backend`) | Vérité fonctionnelle et technique |
| `docker-compose.yml`, `compose.prod.yml`, `k8s/` | Conteneurisation et déploiement |
| `.github/workflows/` | CI et scans de sécurité |
| `docs/analyse-projet/`, `docs/RNCP6-TESTS.md`, README | Conception et tests déjà documentés |
| PDF produit `JuggleFlow-Apprendre-et-Evoluer-par-le-Jonglage.pdf` | Contexte métier, personas, MVP annoncé |
| Captures Podman + wireframes (`captures/`) | Preuves d’environnement et intention UX |

Les informations absentes des sources sont marquées `[À COMPLÉTER / NON VÉRIFIÉ]`.

---

## Sommaire

| Fichier | Contenu |
|---------|---------|
| [00-page-de-garde.md](./00-page-de-garde.md) | Identification du projet et stack |
| [01-contexte-problematique.md](./01-contexte-problematique.md) | Contexte scolaire et problématique |
| [02-personas-besoins.md](./02-personas-besoins.md) | Personas (PDF) et réponses applicatives |
| [03-perimetre-fonctionnel.md](./03-perimetre-fonctionnel.md) | Fonctionnalités code actuel + écarts PDF |
| [04-analyse-conception.md](./04-analyse-conception.md) | CU, maquettes, MCD/MLD, séquences |
| [05-architecture-technique.md](./05-architecture-technique.md) | Architecture en couches, monorepo |
| [06-realisation-frontend-pwa.md](./06-realisation-frontend-pwa.md) | UI, PWA, offline |
| [07-realisation-backend-securite.md](./07-realisation-backend-securite.md) | API, sécurité, RGPD |
| [08-donnees-et-acces.md](./08-donnees-et-acces.md) | PostgreSQL, Redis, Flyway, accès données |
| [09-environnement-podman.md](./09-environnement-podman.md) | Preuves Podman Images / Containers / Volumes |
| [10-qualite-tests-securite.md](./10-qualite-tests-securite.md) | Stratégie de tests et scans |
| [11-deploiement-devops.md](./11-deploiement-devops.md) | Compose, CI, Kubernetes |
| [12-bilan-limites-perspectives.md](./12-bilan-limites-perspectives.md) | Limites documentées et perspectives |
| [13-annexes-couverture-cp.md](./13-annexes-couverture-cp.md) | Glossaire + couverture CP1→CP11 |

---

## Captures jointes

| Fichier | Description |
|---------|-------------|
| `captures/rncp6-vue-synoptique.png` | Vue synoptique emploi-type RNCP6 CDA |
| `captures/wireframes-ui.png` | Wireframes / maquettes UI fournies |
| `captures/podman-images-1.png` | Podman Desktop — Images (backend, Temurin, Redis…) |
| `captures/podman-images-2.png` | Podman Desktop — Images (Postgres, Maven, Testcontainers…) |
| `captures/podman-containers.png` | Podman Desktop — Containers compose `juggleflow` |
| `captures/podman-volumes.png` | Podman Desktop — Volumes pgdata / redisdata / maven_cache |

---

## Mapping rapide RNCP6

![Vue synoptique RNCP6](./captures/rncp6-vue-synoptique.png)

| AT | Compétences | Sections principales |
|----|-------------|----------------------|
| AT1 Développer une application sécurisée | CP1–CP4 | 05, 06, 07, 09, 10 |
| AT2 Concevoir et développer en couches | CP5–CP8 | 02–05, 08 |
| AT3 Préparer le déploiement | CP9–CP11 | 09–11 |

Le détail preuve par compétence est dans [13-annexes-couverture-cp.md](./13-annexes-couverture-cp.md).

---

## Mise en page vers ~60 pages

Cette base Markdown est volontairement dense. Pour atteindre ~60 pages en Word/PDF :

1. Intégrer les captures pleine largeur + légendes.
2. Dupliquer les diagrammes Mermaid depuis `docs/analyse-projet/` en images exportées.
3. Ajouter les extraits de code déjà référencés (`[EXTRAIT CODE : …]`).
4. Joindre des captures runtime UI live si disponibles `[À COMPLÉTER]`.
