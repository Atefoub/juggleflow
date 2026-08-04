# JuggleFlow — Documentation d'analyse projet

**Application :** JuggleFlow — plateforme pédagogique de jonglage en contexte scolaire  
**Date de rédaction :** 30 juin 2026  
**Source :** code source du dépôt `juggleflow` (migrations Flyway V1–V23, frontend React, backend Spring Boot)

> Tous les éléments ci-dessous sont dérivés **exclusivement** du code et du schéma de base de données existants. Aucune fonctionnalité, entité ou écran non implémenté n'a été ajouté.

---

## Contenu

| Document | Description |
|----------|-------------|
| [01-maquettes.md](./01-maquettes.md) | Maquettes fil de fer des écrans (routes et composants réels) |
| [02-mcd-mld.md](./02-mcd-mld.md) | Modèle conceptuel de données (MCD) et modèle logique de données (MLD) |
| [03-diagramme-classes.md](./03-diagramme-classes.md) | Diagramme de classes (entités JPA backend) |
| [04-diagramme-sequences.md](./04-diagramme-sequences.md) | Diagrammes de séquences (flux métier implémentés) |
| [05-diagramme-cas-utilisation.md](./05-diagramme-cas-utilisation.md) | Diagramme de cas d'utilisation par rôle |

---

## Périmètre applicatif

| Rôle | Routes frontend | Préfixe API |
|------|-----------------|-------------|
| Élève (`ROLE_ELEVE`) | `/student/*`, `/onboarding` | `/api/eleve/*`, `/api/progress`, `/api/tricks`, `/api/badges` |
| Enseignant (`ROLE_ENSEIGNANT`) | `/teacher/*` | `/api/enseignant/*` |
| Administrateur (`ROLE_ADMINISTRATEUR`) | `/admin/*` | `/api/admin/*` |

**Stack :** React 19 + Vite (PWA) · Spring Boot 3.4 · PostgreSQL 17 · JWT + Redis

---

## Limites documentées (état réel du code)

- La table `practice_session` existe en base (migration V5) mais **aucun service de production n'y écrit** actuellement ; le chronomètre de session est géré côté UI (`StudentSessionPage.tsx`), et le streak est mis à jour via `PUT /api/progress/{trickId}`.
- L'XP et les rangs (Bronze, Argent, Or) sont calculés côté frontend (`StudentDashboardPage.tsx`, `BadgesPage.tsx`), pas persistés en base.
