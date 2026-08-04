# 02 — Personas et besoins utilisateurs

**Source exclusive personas :** PDF produit `JuggleFlow-Apprendre-et-Evoluer-par-le-Jonglage.pdf` (pages 4–5).  
**Réponses techniques :** croisement avec le code actuel (README, routes, services).  
Principe cité dans le PDF : *« En concevant pour les profils les plus exigeants, on crée une application meilleure pour tout le monde. »*

---

## 1. Personas élèves

### 1.1 Léa — 8 ans, CE2 (hypersensibilité sensorielle)

| Dimension | Contenu PDF |
|-----------|-------------|
| Besoin | Environnement calme, prévisible, sans surprises sensorielles |
| Caractéristiques | Hypersensibilité, apprécie les routines |
| Insatisfactions | Interfaces surchargées, sons/animations agressifs, transitions brusques |
| Comportements | Recommence les exercices, montre ses réussites, s’entraîne à la récréation |

**Réponses présentes dans le code (pas inventées) :**

- thème sombre par défaut + préférence thème persistée (`dark_mode_enabled`, `theme.ts`, `ThemeSwitcher`) ;
- interface élève mobile-first, largeur max ~430 px (`01-maquettes.md`, pages `student/`) ;
- progression claire par statut (`NOT_STARTED` / `IN_PROGRESS` / `MASTERED`).

**Non vérifié dans le code :** désactivation systématique des sons/animations « agressifs » `[À COMPLÉTER / NON VÉRIFIÉ]`.

### 1.2 Malik — 9 ans, CM1 (TDAH)

| Dimension | Contenu PDF |
|-----------|-------------|
| Besoin | Récompenses rapides et visibles, canaliser l’énergie |
| Caractéristiques | Impulsif, besoin de bouger, réagit aux récompenses visuelles |
| Insatisfactions | Sessions trop longues, feedback différé, manque de micro-objectifs |
| Comportements | Se lève, lance trop vite, perd le fil après ~3 minutes |

**Réponses code :**

- défi du jour (`DailyChallengeController`, dashboard élève) ;
- badges débloqués côté backend après progression (`BadgeService`) ;
- XP / rang affichés côté UI (calcul présentation frontend — voir limites §3) ;
- sessions chronométrées UI (`StudentSessionPage.tsx`).

### 1.3 Chloé — 7 ans, CE1 (dyspraxie)

| Dimension | Contenu PDF |
|-----------|-------------|
| Besoin | Progresser à son rythme sans sentiment d’échec ; décomposition geste par geste |
| Caractéristiques | Difficultés coordination œil-main, lenteur, bonne mémoire auditive |
| Insatisfactions | Absence de décomposition, textes trop petits, sentiment d’échec |
| Comportements | Recommence, a besoin de temps, préfère les foulards |

**Réponses code :**

- conseils pédagogiques / tips JSONB sur les figures (`learningTips`, fiche `TrickDetailPage`) ;
- prérequis de figures ;
- parcours ordonnés par étapes (`LearningPathStep`) ;
- onboarding de niveau initial (`BEGINNER` → `EXPERT`).

**Non vérifié :** contenus spécifiques « foulards » ou textes adaptés dyspraxie comme feature dédiée `[À COMPLÉTER / NON VÉRIFIÉ]`.

---

## 2. Personas adultes

### 2.1 Marc — 38 ans, professeur des écoles CE2

| Dimension | Contenu PDF |
|-----------|-------------|
| Besoin | Contenus clés en main, justifier l’investissement, différencier pour ~25 élèves |
| Caractéristiques | Pas expert jonglage, besoin de gagner du temps |
| Insatisfactions | Suivi individuel difficile, collecte des consentements, conformité RGPD |
| Comportements | Partage avec collègues, paramètre les rôles, exporte les données |

**Réponses code (espace enseignant) :**

- dashboard classe, alertes de blocage (`StudentBlockageService` — ≥3 tentatives sans maîtrise) ;
- groupes VERT / ORANGE / ROUGE (auto ou manuel) ;
- assignation de parcours classe ou individuelle (priorité individuelle) ;
- export CSV de progression ;
- ressources pédagogiques audience `TEACHER`.

*Note :* la gestion fine des consentements RGPD est dans l’espace **administrateur** (`AdminRgpdPage`, `GdprController`), pas dans l’UI enseignant.

### 2.2 Sophie — 43 ans, directrice / référente numérique

| Dimension | Contenu PDF |
|-----------|-------------|
| Besoin | Activités innovantes, gestion centralisée des comptes |
| Caractéristiques | Pas de formation jonglage spécifique, besoin de légitimité pédagogique |
| Insatisfactions | Multiplication des plateformes, complexité juridique RGPD |
| Comportements | Vérifie consentements, gère licences, consulte le tableau de bord |

**Réponses code (espace admin) :**

- dashboard établissement (`AdminDashboardPage`, `GET /api/admin/stats`) ;
- gestion utilisateurs / classes / licence (`EstablishmentSettings`, siège + expiration) ;
- console RGPD (consentements, exports CSV/PDF, relances) ;
- journal d’audit (`AdminAuditEvent`).

---

## 3. Tableau récapitulatif PDF ↔ technique

| Cible | Besoin majeur (PDF) | Réponse technique / UX (code) |
|-------|---------------------|-------------------------------|
| Élèves (dont neuro-atypiques) | Accessibilité & motivation | Mode sombre, feedback progression, badges, défi du jour, tutoriels / tips |
| Enseignants | Suivi simplifié | Dashboard, groupes, blocages, export CSV, ressources |
| Direction / IT | Sécurité & cadre | Auth JWT, RBAC, RGPD admin, licence, audit |

---

## 4. Limites à expliciter à l’oral / dans le dossier

- L’**XP et les rangs Bronze / Argent / Or** sont principalement une **présentation frontend** (XP ≈ `totalTricksLearned × 100`, plafond d’affichage 500, rang Bronze constant dans l’UI actuelle) — documenté dans `docs/analyse-projet/README.md` et confirmé dans les pages élève.
- Les **badges « officiels »** sont calculés et persistés côté backend ; certains badges de régularité / jalons sont aussi **calculés pour l’affichage** côté frontend (`BadgesPage.tsx`).
- Le PDF MVP annonce un périmètre plus petit (1 parcours « 2 balles », 8 exercices) : voir tableau d’écarts dans [03-perimetre-fonctionnel.md](./03-perimetre-fonctionnel.md).
