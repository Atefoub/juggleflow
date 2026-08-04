# 06 — Réalisation frontend (PWA)

**Sources :** `apps/frontend/`, `package.json` racine, `vite.config.mts`, docs analyse.

---

## 1. Stack UI

| Élément | Version / techno | Preuve |
|---------|------------------|--------|
| React / React DOM | 19 | `package.json` |
| TypeScript | ~5.9 | `package.json` |
| Vite | 8 | `package.json` |
| React Router | 6.30 | `AppRouter.tsx` |
| Tailwind CSS | 4.2 (`@tailwindcss/vite`) | `package.json` |
| TanStack Query | 5 | `package.json` |
| Axios | 1.15 | `package.json` |
| RHF + Zod | validation formulaires | Login / forms |
| PWA | `vite-plugin-pwa` 1.3 | `vite.config.mts` |

Le `apps/frontend/package.json` est minimal (`private`) : dépendances au **workspace racine**.

---

## 2. Organisation des pages

Chargement : `React.lazy` + `Suspense` dans `AppRouter.tsx`.

### Élève
`OnboardingPage`, `StudentDashboardPage`, `CataloguePage`, `TrickDetailPage`, `StudentSessionPage`, `ProgressPage`, `BadgesPage`, `StudentProfilePage`, `ResourcesStudentPage`, `StudentLearningPathPage`.

### Enseignant
`TeacherDashboardPage`, `StudentListPage`, `GroupManagementPage`, `StudentDetailPage`, `AssignPathPage`, `TeacherPathDetailPage`, `ResourcesTeacherPage` — layout `TeacherLayout`.

### Admin
`AdminDashboardPage`, `AdminUsersPage`, `AdminClassesPage`, `AdminResourcesPage`, `AdminRgpdPage`, `AdminAuditPage` — layout `AdminLayout`.

---

## 3. Authentification client

Fichiers : `authApi.ts`, `AuthContext.tsx`, `LoginPage.tsx`.

1. `POST /api/auth/login` → access token **en mémoire** uniquement.  
2. Refresh token via cookie httpOnly (`withCredentials: true`).  
3. `GET /api/auth/me` pour le profil.  
4. Intercepteur : sur 401, un seul refresh concurrent puis replay.  
5. Au démarrage : tentative `refresh` puis `/me`.  
6. Logout : API + purge token mémoire + snapshot étudiant.

Bouton ENT sur login : **désactivé** (« Bientôt ») — pas d’OAuth Google dans le code.

---

## 4. PWA et hors-ligne

### 4.1 Manifeste (`vite.config.mts`)

- Nom `JuggleFlow`, `display: standalone`, orientation portrait, langue FR.
- Icônes 192 / 512.
- Raccourcis : Catalogue, Progression, Accueil, Parcours.

### 4.2 Stratégies Workbox (config)

| Route / asset | Stratégie |
|---------------|-----------|
| Build assets | Precache |
| Navigation SPA | `index.html` (hors `/api/*`) |
| `/api/auth*` | NetworkOnly |
| `PUT /api/progress/*` | NetworkOnly |
| `/api/tricks`, `/api/learning-paths` | NetworkFirst (24 h) |
| Autres `/api/*` | NetworkOnly |
| Fonts Google | StaleWhileRevalidate |
| Images | CacheFirst (30 j) |

Enregistrement : `pwaRegister.ts` ; bannières `PwaUpdateBanner`, `PwaInstallPrompt`.

### 4.3 Offline applicatif (pas Background Sync Workbox)

| Mécanisme | Fichiers | Comportement |
|-----------|----------|--------------|
| IndexedDB `juggleflow` | `idb.ts`, `offlineCatalogueStore.ts`, `offlineStudentStore.ts` | Snapshots catalogue / stats / parcours / badges / défi |
| Préchargement | `prefetchOffline*.ts` | Depuis profil élève |
| File progression | `offlineQueue.ts` | ≤50 MAJ / user dans `localStorage`, dernière gagne par figure |
| Flush | `AuthContext` | Retour online / visibility / retry 5 s |
| UI sync | `SyncStatusBanner.tsx` | pending / sync / erreur / succès |

**Fait important :** aucun `BackgroundSyncPlugin` / `SyncManager` n’est implémenté. La sync nécessite l’application ouverte.

### 4.4 Couverture test offline

Vitest couvre la file ; **pas** d’E2E Playwright offline PWA (`docs/RNCP6-TESTS.md`).

---

## 5. Gamification côté UI

| Élément | Où calculé | Persistance |
|---------|------------|-------------|
| Badges officiels | Backend `BadgeService` | Oui (`user_badge`) |
| Badges régularité / jalons affichés | Frontend `BadgesPage` | Non (présentation) |
| XP affiché | Frontend ≈ `totalTricksLearned × 100` (plafond 500) | Non |
| Rang | Affichage Bronze constant ; Argent comme objectif textuel | Non |

---

## 6. Thème et accessibilité UI

- Tokens CSS `@theme` dans `index.css`.
- Thème clair via `data-theme="light"`.
- Thème admin isolé `.jf-admin`.
- Préférences synchronisées (`theme.ts`, `AppThemeSync`).
- Cibles tactiles ~44–48 px fréquentes.

---

## 7. Points d’attention pour la soutenance

1. Distinguer **PWA Workbox** (cache) et **file offline custom** (progression).  
2. Montrer le profil élève : installation PWA + préchargement offline.  
3. Ne pas revendiquer OAuth Google / ENT.  
4. Joindre `[EXTRAIT CODE : vite.config.mts — VitePWA]` et `[EXTRAIT CODE : offlineQueue.ts]`.
