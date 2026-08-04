# Maquettes — JuggleFlow

**Date :** 30 juin 2026  
**Référence code :** `apps/frontend/src/pages/`, `apps/frontend/src/router/AppRouter.tsx`

Les maquettes ci-dessous décrivent la structure réelle des écrans implémentés. Conventions :

- **Mobile-first** pour l'interface élève (largeur max ~430 px, navigation basse)
- **Sidebar** pour enseignant et administrateur
- Thème sombre par défaut (élève) ; thème admin dédié (`--color-admin-*`)

---

## 1. Écrans publics

### 1.1 Connexion — `/login`

**Fichier :** `LoginPage.tsx`

```
┌─────────────────────────────────────┐
│                                     │
│         [Logo JuggleFlow]           │
│   Plateforme pédagogique de         │
│           jonglage                  │
│                                     │
│  Adresse e-mail institutionnelle      │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Mot de passe                       │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ Se connecter ]                   │
│                                     │
│  Mot de passe oublié ?              │
│                                     │
└─────────────────────────────────────┘
```

**Comportement :** redirection selon le rôle (`ROLE_ELEVE` → dashboard ou onboarding, `ROLE_ENSEIGNANT` → `/teacher/dashboard`, `ROLE_ADMINISTRATEUR` → `/admin/dashboard`).

### 1.2 Mot de passe oublié — `/login/forgot`

**Fichier :** `ForgotPasswordPage.tsx`  
Formulaire email → `POST /api/auth/forgot-password`.

### 1.3 Onboarding élève — `/onboarding`

**Fichier :** `OnboardingPage.tsx`  
Sélection du niveau initial (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`) → `POST /api/eleve/onboarding`. Obligatoire avant l'accès au dashboard si `onboardingCompleted` est faux.

---

## 2. Interface élève (PWA mobile)

**Navigation basse** (`BottomNav.tsx`, `studentNav.ts`) : Accueil · Catalogue · Progression · Profil

### 2.1 Dashboard — `/student/dashboard`

**Fichier :** `StudentDashboardPage.tsx`

```
┌─────────────────────────────────────┐
│ [OfflineBanner si hors-ligne]       │
│                                     │
│  Bonjour, {prénom}        [Déco]    │
│                                     │
│  ┌─ XP / Rang ─────────────────┐   │
│  │  {xp} / 500 XP  ·  {rang}   │   │
│  │  ████████░░░░  barre XP     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ Défi du jour ──────────────┐   │
│  │  {titre}  ·  {description}  │   │
│  │  [ Commencer / Explorer ]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ Parcours assigné ──────────┐   │
│  │  {nom parcours}             │   │
│  │  ██████░░░░  {n}%           │   │
│  │  [liste figures PathTrickList]│  │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ Badges récents ────────────┐   │
│  │  [icônes badges débloqués]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────┬──────┬──────┬──────┐     │
│  │Accueil│Catal.│Prog. │Profil│    │
│  └──────┴──────┴──────┴──────┘     │
└─────────────────────────────────────┘
```

**Données :** `getStudentStatistics`, `getStudentBadges`, `getStudentLearningPaths`, `getStudentDailyChallenge`, `getStudentProgress` (avec fusion offline via `mergePendingIntoProgress`).

### 2.2 Catalogue — `/student/catalogue`

**Fichier :** `CataloguePage.tsx`

- Filtres par catégorie et niveau de difficulté
- Grille de cartes figure (`TrickCard.tsx`) : nom, difficulté (`DifficultyChip`), animation (`AnimationPreview` via Juggling Lab)
- Favoris (étoile) → `PUT/DELETE /api/eleve/favorites/{trickId}`

### 2.3 Détail figure — `/student/trick/:id`

**Fichier :** `TrickDetailPage.tsx`

- Animation siteswap (proxy `/api/juggling-lab/anim`)
- Description, conseils (`learning_tips`), prérequis
- Statut progression (NOT_STARTED / IN_PROGRESS / MASTERED)
- Bouton « Commencer la session » → `/student/session/:id`

### 2.4 Session de pratique — `/student/session/:id`

**Fichier :** `StudentSessionPage.tsx`

- Chronomètre (UI)
- Mise à jour progression → `PUT /api/progress/{trickId}` (ou file d'attente offline `offlineQueue.ts`)

### 2.5 Progression — `/student/progression`

**Fichier :** `ProgressPage.tsx`  
Liste des figures avec statut et pourcentage de maîtrise.

### 2.6 Badges — `/student/badges`

**Fichier :** `BadgesPage.tsx`  
Catalogue complet des badges (débloqués / verrouillés), calcul rang côté client.

### 2.7 Profil — `/student/profil`

**Fichier :** `StudentProfilePage.tsx`

- Statistiques (série, figures maîtrisées)
- Préférences : mode sombre, rappels → `PATCH /api/eleve/preferences`
- Liens : Ressources, Parcours, Badges, Module cerveau
- PWA : installation, préchargement offline, déconnexion

### 2.8 Ressources — `/student/resources`

**Fichier :** `ResourcesStudentPage.tsx`  
Vidéos, exercices, module cerveau (`GET /api/resources?audience=STUDENT`).

### 2.9 Parcours — `/student/parcours` et `/student/parcours/:pathId`

**Fichier :** `StudentLearningPathPage.tsx`  
Parcours assignés (`GET /api/eleve/learning-paths`) avec étapes ordonnées.

---

## 3. Interface enseignant (sidebar)

**Layout :** `TeacherLayout.tsx` + `TeacherSidebar.tsx`  
**Navigation :** `teacherNav.ts` — Dashboard · Élèves · Groupes · Assigner parcours · Ressources

### 3.1 Dashboard — `/teacher/dashboard`

**Fichier :** `TeacherDashboardPage.tsx`

```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │  Header : {nom enseignant}               │
│          │  Classe : [sélecteur classes]            │
│ Dashboard│                                          │
│ Élèves   │  ┌─ KPI progression moyenne ─────────┐  │
│ Groupes  │  │  {n}%  ·  barre ProgressBar       │  │
│ Parcours │  └───────────────────────────────────┘  │
│ Ressources│                                         │
│          │  ┌─ Groupes ─────────────────────────┐  │
│          │  │ VERT ({n})  ORANGE ({n})  ROUGE ({n})│
│          │  │ [cartes élèves par groupe]        │  │
│          │  └───────────────────────────────────┘  │
│          │                                          │
│          │  ┌─ Alertes blocage ─────────────────┐  │
│          │  │ élèves blocked = true           │  │
│          │  └───────────────────────────────────┘  │
│          │                                          │
│          │  ┌─ Parcours assignés ───────────────┐  │
│          │  │ StudentPathSummary par parcours │  │
│          │  │ [Désassigner] [Voir détail]     │  │
│          │  └───────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────┘
```

### 3.2 Liste élèves — `/teacher/eleves`

**Fichier :** `StudentListPage.tsx`  
Liste par classe, création élève (`POST /api/enseignant/classes/{classId}/students`).

### 3.3 Gestion groupes — `/teacher/groupes`

**Fichier :** `GroupManagementPage.tsx`  
Assignation manuelle VERT / ORANGE / ROUGE (`PATCH .../group`).

### 3.4 Fiche élève — `/teacher/eleve/:id`

**Fichier :** `StudentDetailPage.tsx`  
Contexte élève (`GET /api/enseignant/students/{id}/context`), progression, parcours effectif.

### 3.5 Assigner parcours — `/teacher/parcours/assigner`

**Fichier :** `AssignPathPage.tsx`  
Assignation à une classe ou individuellement (`POST .../paths`).

### 3.6 Détail parcours classe — `/teacher/classe/:classId/parcours/:pathId`

**Fichier :** `TeacherPathDetailPage.tsx`  
Progression par élève, export CSV (`GET .../progress/export`).

### 3.7 Ressources — `/teacher/ressources`

**Fichier :** `ResourcesTeacherPage.tsx`  
Études PDF, vidéos formation, guides (`audience=TEACHER`).

---

## 4. Interface administrateur (sidebar)

**Layout :** `AdminLayout.tsx` + `AdminSidebar.tsx`  
**Navigation :** `adminNav.ts` — Dashboard · Utilisateurs · Classes · Ressources · RGPD · Audit

### 4.1 Dashboard — `/admin/dashboard`

**Fichier :** `AdminDashboardPage.tsx`

- Onglets « Classes » / « RGPD »
- Cartes KPI (`KpiCard`) : utilisateurs, classes, élèves, consentements
- Section licence (`AdminLicenseSection`) : sièges, expiration
- Export CSV consentements

### 4.2 Utilisateurs — `/admin/users`

**Fichier :** `AdminUsersPage.tsx`  
CRUD, activation/désactivation, reset mot de passe (`CreateUserModal.tsx`).

### 4.3 Classes — `/admin/classes`

**Fichier :** `AdminClassesPage.tsx`  
Création, édition, suppression de classes.

### 4.4 Ressources — `/admin/resources`

**Fichier :** `AdminResourcesPage.tsx`  
Upload PDF (`POST /api/admin/resources/{id}/file`).

### 4.5 RGPD — `/admin/rgpd`

**Fichier :** `AdminRgpdPage.tsx`  
Consentements parentaux, enregistrement, révocation, exports CSV/PDF.

### 4.6 Audit — `/admin/audit`

**Fichier :** `AdminAuditPage.tsx`  
Journal `admin_audit_event` (`GET /api/admin/audit-events`).

---

## 5. Composants transverses

| Composant | Rôle |
|-----------|------|
| `SyncStatusBanner.tsx` | État synchronisation offline |
| `OfflineBanner.tsx` | Alerte mode hors-ligne |
| `PwaUpdateBanner.tsx` | Mise à jour service worker |
| `PwaInstallPrompt.tsx` | Invitation installation PWA |
| `AppThemeSync.tsx` | Synchronisation thème sombre/clair |
| `ErrorBoundary.tsx` | Gestion erreurs React |

---

## 6. Cartographie routes ↔ pages

| Route | Page | Rôle |
|-------|------|------|
| `/login` | `LoginPage` | Public |
| `/login/forgot` | `ForgotPasswordPage` | Public |
| `/onboarding` | `OnboardingPage` | Élève |
| `/student/dashboard` | `StudentDashboardPage` | Élève |
| `/student/catalogue` | `CataloguePage` | Élève |
| `/student/trick/:id` | `TrickDetailPage` | Élève |
| `/student/session/:id` | `StudentSessionPage` | Élève |
| `/student/progression` | `ProgressPage` | Élève |
| `/student/badges` | `BadgesPage` | Élève |
| `/student/profil` | `StudentProfilePage` | Élève |
| `/student/resources` | `ResourcesStudentPage` | Élève |
| `/student/parcours` | `StudentLearningPathPage` | Élève |
| `/teacher/dashboard` | `TeacherDashboardPage` | Enseignant |
| `/teacher/eleves` | `StudentListPage` | Enseignant |
| `/teacher/groupes` | `GroupManagementPage` | Enseignant |
| `/teacher/eleve/:id` | `StudentDetailPage` | Enseignant |
| `/teacher/parcours/assigner` | `AssignPathPage` | Enseignant |
| `/teacher/classe/:classId/parcours/:pathId` | `TeacherPathDetailPage` | Enseignant |
| `/teacher/ressources` | `ResourcesTeacherPage` | Enseignant |
| `/admin/dashboard` | `AdminDashboardPage` | Admin |
| `/admin/users` | `AdminUsersPage` | Admin |
| `/admin/classes` | `AdminClassesPage` | Admin |
| `/admin/resources` | `AdminResourcesPage` | Admin |
| `/admin/rgpd` | `AdminRgpdPage` | Admin |
| `/admin/audit` | `AdminAuditPage` | Admin |
