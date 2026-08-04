# 01 — Contexte et problématique

**Sources :** PDF produit `JuggleFlow-Apprendre-et-Evoluer-par-le-Jonglage.pdf` (pages 1–3, 6–7) ; README du dépôt.

---

## 1. Contexte pédagogique

Le jonglage n’est pas présenté comme une activité isolée : le PDF le rattache aux objectifs du **Socle commun de connaissances, de compétences et de culture**.

| Domaine du socle | Apport du jonglage (selon le PDF) |
|------------------|-----------------------------------|
| Domaine 1 — Langages pour penser et communiquer | Coordination motrice, expression corporelle, communication non verbale |
| Domaine 2 — Méthodes et outils pour apprendre | Persévérance, expérimentation, essai-erreur |
| Domaine 3 — Systèmes naturels et techniques | Mouvement, gravité, principes physiques concrets |
| Domaine 4 — Représentations du monde et activité humaine | Créativité, expression artistique, conscience spatiale |

Compétences transversales citées : autonomie, responsabilité, collaboration.

Le README du dépôt précise l’usage cible : **plateforme pédagogique web pour l’apprentissage du jonglage en contexte scolaire**, utilisable en salle grâce au mode PWA (installation, usage hors connexion pendant les séances).

---

## 2. Problématique métier

### 2.1 Défis des enseignants (PDF)

Le PDF liste six freins à l’intégration du jonglage dans les programmes :

1. **Manque de ressources structurées** — supports pédagogiques clairs et centralisés insuffisants.
2. **Adaptation difficile aux élèves** — rythmes et capacités hétérogènes.
3. **Contraintes de temps** — préparation et suivi coûteux pour l’enseignant.
4. **Absence de suivi immédiat** — peu d’outils de feedback et de progression individuelle.
5. **Motivation et engagement** — maintien de l’intérêt sans dispositifs ludiques.
6. **Justification pédagogique** — besoin d’aligner l’activité sur les programmes.

### 2.2 Réponse produit (intention)

Le PDF positionne JuggleFlow comme :

- un **parcours d’apprentissage structuré** (centralisation des ressources, progression débutant → expert) ;
- un **levier de motivation** (badges, statistiques) ;
- un **pack éducatif** pour les écoles (contenus, suivi de classe, ressources téléchargeables, licences collectives).

Le code actuel matérialise une partie substantielle de cette intention (parcours, catalogue, suivi enseignant, badges, licences, RGPD). Le détail factuel est dans [03-perimetre-fonctionnel.md](./03-perimetre-fonctionnel.md).

---

## 3. Problématique technique (candidat CDA)

Au-delà du métier, le projet répond aux exigences d’une application professionnelle :

| Enjeu | Réponse constatée dans le code |
|-------|--------------------------------|
| Application multi-rôles sécurisée | RBAC Spring Security (`ROLE_ELEVE`, `ROLE_ENSEIGNANT`, `ROLE_ADMINISTRATEUR`) |
| Usage mobile en salle / hors ligne | PWA (Workbox) + file de synchronisation de progression |
| Données mineurs / établissement | Consentements parentaux, exports, anonymisation fin d’année |
| Environnement reproductible | Podman Compose (PostgreSQL, Redis, backend) |
| Qualité et déploiement | Tests JUnit / Vitest / Playwright, CI GitHub Actions, manifests Kubernetes |

---

## 4. Objectifs du projet (formulés à partir des sources)

Objectifs **métier** (PDF + README) :

- structurer l’apprentissage du jonglage (parcours, figures, ressources) ;
- faciliter le suivi enseignant (classe, groupes, blocages, exports) ;
- fournir un espace admin (utilisateurs, classes, licence, RGPD).

Objectifs **techniques** (dépôt) :

- livrer une PWA React + API Spring Boot en couches ;
- sécuriser l’API (JWT, cookies, rate limiting, Redis en multi-instances) ;
- versionner le schéma (Flyway) et conteneuriser l’environnement (Podman).

---

## 5. Périmètre hors dossier

Les éléments suivants ne sont **pas** affirmés comme livrés :

- intégration ENT active (bouton « Bientôt » sur `LoginPage.tsx`) ;
- déploiement Kubernetes en production live (manifests présents, pas de workflow CD) ;
- métriques d’usage réel en établissement `[À COMPLÉTER / NON VÉRIFIÉ]`.
