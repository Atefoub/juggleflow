# Diagrammes de séquences — JuggleFlow

**Date :** 30 juin 2026  
**Source :** flux implémentés dans le code frontend et backend

---

## 1. Authentification (connexion + session)

**Fichiers :** `LoginPage.tsx` → `authApi.ts` → `AuthController.java` → `AuthService.java` → `AuthContext.tsx`

```mermaid
sequenceDiagram
    actor Eleve as Élève
    participant LoginPage
    participant authApi
    participant AuthController
    participant AuthService
    participant JwtUtils
    participant AuthContext

    Eleve->>LoginPage: Saisit email + mot de passe
    LoginPage->>authApi: POST /api/auth/login
    authApi->>AuthController: credentials
    AuthController->>AuthService: login(email, password)
    AuthService->>AuthService: BCrypt verify password
    AuthService->>JwtUtils: generateAccessToken(user)
    AuthService->>AuthService: generateRefreshToken + set httpOnly cookie
    AuthService-->>AuthController: accessToken
    AuthController-->>authApi: 200 { accessToken }
    authApi-->>LoginPage: accessToken
    LoginPage->>authApi: GET /api/auth/me (Bearer)
    authApi->>AuthController: me()
    AuthController-->>authApi: UserProfile (role, onboardingCompleted)
    authApi-->>AuthContext: login(accessToken)
    alt ROLE_ELEVE et onboarding non terminé
        AuthContext-->>LoginPage: redirect /onboarding
    else Rôle connu
        AuthContext-->>LoginPage: redirect dashboard selon rôle
    end
```

**Refresh automatique :** `AuthContext.tsx` intercepte les 401, appelle `POST /api/auth/refresh` (cookie), met à jour l'access token en mémoire.

**Déconnexion :** `POST /api/auth/logout` → révocation JTI (Redis) + suppression cookie refresh.

---

## 2. Mise à jour de progression (avec synchronisation offline)

**Fichiers :** `StudentSessionPage.tsx` → `offlineQueue.ts` → `ProgressController.java` → `ProgressService.java` → `BadgeService.java` → `StreakService.java`

```mermaid
sequenceDiagram
    actor Eleve as Élève
    participant SessionPage as StudentSessionPage
    participant offlineQueue
    participant studentApi
    participant ProgressController
    participant ProgressService
    participant StreakService
    participant BadgeService
    participant AuthContext

    Eleve->>SessionPage: Termine session / marque maîtrisé
    SessionPage->>studentApi: PUT /api/progress/{trickId}

    alt En ligne
        studentApi->>ProgressController: ProgressRequest
        ProgressController->>ProgressService: updateProgress(userId, trickId, request)
        ProgressService->>ProgressService: upsert UserProgress
        ProgressService->>StreakService: updateStreakOnPractice(userId)
        ProgressService->>BadgeService: evaluateAndUnlock(userId)
        BadgeService-->>ProgressService: badges débloqués
        ProgressService-->>ProgressController: ProgressResponse
        ProgressController-->>studentApi: 200
    else Hors ligne
        SessionPage->>offlineQueue: enqueueProgressUpdate(userId, trickId, status)
        offlineQueue->>offlineQueue: persiste IndexedDB
    end

    Note over AuthContext,offlineQueue: Au retour en ligne
    AuthContext->>offlineQueue: flushProgressUpdates(userId)
    loop Pour chaque entrée en file
        offlineQueue->>studentApi: PUT /api/progress/{trickId}
        studentApi->>ProgressController: sync
    end
```

**Note :** la table `practice_session` n'est pas alimentée par ce flux ; le chronomètre reste côté UI.

---

## 3. Assignation de parcours par l'enseignant

**Fichiers :** `AssignPathPage.tsx` → `pathsApi.ts` → `LearningPathController.java` → `LearningPathService.java`

```mermaid
sequenceDiagram
    actor Enseignant
    participant AssignPage as AssignPathPage
    participant pathsApi
    participant LearningPathController
    participant LearningPathService
    participant PathAssignmentResolver
    participant DB as PostgreSQL

    Enseignant->>AssignPage: Sélectionne parcours + classe ou élève
    AssignPage->>pathsApi: POST /api/enseignant/classes/{classId}/paths
    pathsApi->>LearningPathController: assignPathToClass()
    LearningPathController->>LearningPathService: assignToClass(classId, pathId, dates)
    LearningPathService->>DB: INSERT class_learning_path
    LearningPathService-->>AssignPage: confirmation

    opt Assignation individuelle
        AssignPage->>pathsApi: POST .../students/{studentId}/paths
        pathsApi->>LearningPathController: assignPathToStudent()
        LearningPathController->>LearningPathService: assignToStudent()
        LearningPathService->>DB: INSERT student_learning_path
    end

    Note over PathAssignmentResolver: Résolution côté lecture
    Enseignant->>pathsApi: GET .../students/{id}/paths/effective
    pathsApi->>LearningPathController: getEffectivePath()
    LearningPathController->>PathAssignmentResolver: resolvePrimaryPath(studentId, classId)
    PathAssignmentResolver->>DB: SELECT student_learning_path (prioritaire)
    alt Aucune assignation individuelle
        PathAssignmentResolver->>DB: SELECT class_learning_path
    end
    PathAssignmentResolver-->>AssignPage: parcours effectif
```

---

## 4. Détection de blocage élève (dashboard enseignant)

**Fichiers :** `TeacherDashboardPage.tsx` → `SchoolClassController.java` → `StudentBlockageService.java`

```mermaid
sequenceDiagram
    actor Enseignant
    participant Dashboard as TeacherDashboardPage
    participant teacherApi
    participant SchoolClassController
    participant SchoolClassService
    participant PathAssignmentResolver
    participant StudentBlockageService

    Enseignant->>Dashboard: Sélectionne une classe
    Dashboard->>teacherApi: GET /api/enseignant/classes/{classId}/students
    teacherApi->>SchoolClassController: listStudents()
    SchoolClassController->>SchoolClassService: getStudentSummaries(classId)

    loop Pour chaque élève
        SchoolClassService->>PathAssignmentResolver: resolvePrimaryPath()
        SchoolClassService->>StudentBlockageService: isBlocked(studentId, path)
        StudentBlockageService->>StudentBlockageService: étape courante du parcours
        StudentBlockageService->>StudentBlockageService: attempt_count >= 3 sans MASTERED ?
        StudentBlockageService-->>SchoolClassService: blocked: true/false
    end

    SchoolClassService-->>Dashboard: StudentSummary[] (groupColor, blocked, progressionPercent)
    Dashboard->>Dashboard: Affiche alertes blocage
```

---

## 5. Consentement RGPD (administrateur)

**Fichiers :** `AdminRgpdPage.tsx` → `adminGdprApi.ts` → `GdprController.java` → `GdprService.java` → `AdminAuditService.java`

```mermaid
sequenceDiagram
    actor Admin as Administrateur
    participant RgpdPage as AdminRgpdPage
    participant adminGdprApi
    participant GdprController
    participant GdprService
    participant AdminAuditService
    participant DB as PostgreSQL

    Admin->>RgpdPage: Consulte consentements classe
    RgpdPage->>adminGdprApi: GET /api/admin/gdpr/classes/{classId}/consents
    adminGdprApi->>GdprController: listConsents()
    GdprController->>GdprService: getConsentStatusForClass()
    GdprService->>DB: SELECT gdpr_consent
    GdprService-->>RgpdPage: ConsentStatusRow[]

    Admin->>RgpdPage: Enregistre consentement parental
    RgpdPage->>adminGdprApi: POST /api/admin/gdpr/consents
    adminGdprApi->>GdprController: recordConsent()
    GdprController->>GdprService: recordConsent(userId, type, given, policyVersion)
    GdprService->>DB: UPSERT gdpr_consent (UNIQUE user_id + consent_type)
    GdprService->>AdminAuditService: log(action, actorEmail, details)
    AdminAuditService->>DB: INSERT admin_audit_event
    GdprService-->>RgpdPage: confirmation

    opt Export PDF
        Admin->>RgpdPage: Export PDF
        RgpdPage->>adminGdprApi: GET .../consents/export.pdf
        adminGdprApi->>GdprController: exportPdf()
        GdprController->>GdprService: exportConsentsPdf()
        GdprService-->>RgpdPage: fichier PDF (OpenPDF)
    end
```

---

## 6. Onboarding élève

**Fichiers :** `OnboardingPage.tsx` → `studentOnboardingApi.ts` → `EleveOnboardingController.java` → `StudentOnboardingService.java`

```mermaid
sequenceDiagram
    actor Eleve as Élève
    participant OnboardingPage
    participant studentOnboardingApi
    participant EleveOnboardingController
    participant StudentOnboardingService
    participant DB as PostgreSQL

    Eleve->>OnboardingPage: Choisit niveau (BEGINNER…EXPERT)
    OnboardingPage->>studentOnboardingApi: POST /api/eleve/onboarding
    studentOnboardingApi->>EleveOnboardingController: completeOnboarding()
    EleveOnboardingController->>StudentOnboardingService: completeOnboarding(userId, level)
    StudentOnboardingService->>DB: UPDATE student SET juggling_level, onboarding_completed_at
    StudentOnboardingService-->>OnboardingPage: profil mis à jour
    OnboardingPage->>OnboardingPage: redirect /student/dashboard
```

---

## 7. Défi du jour

**Fichiers :** `StudentDashboardPage.tsx` → `DailyChallengeController.java` → `DailyChallengeService.java`

```mermaid
sequenceDiagram
    actor Eleve as Élève
    participant Dashboard as StudentDashboardPage
    participant studentApi
    participant DailyChallengeController
    participant DailyChallengeService
    participant DB as PostgreSQL

    Dashboard->>studentApi: GET /api/eleve/daily-challenge
    studentApi->>DailyChallengeController: getTodayChallenge()
    DailyChallengeController->>DailyChallengeService: getTodayChallenge()
    DailyChallengeService->>DB: SELECT daily_challenge WHERE active = true
    DailyChallengeService->>DailyChallengeService: slot = epochDay % count(active)
    DailyChallengeService-->>Dashboard: DailyChallengeResponse (title, trickId, targetValue)
    Dashboard->>Dashboard: Affiche carte défi + CTA
```

---

## Récapitulatif des flux documentés

| # | Flux | Acteur | Endpoints clés |
|---|------|--------|----------------|
| 1 | Authentification | Tous | `POST /api/auth/login`, `GET /api/auth/me` |
| 2 | Progression offline | Élève | `PUT /api/progress/{trickId}` |
| 3 | Assignation parcours | Enseignant | `POST .../paths`, `GET .../effective` |
| 4 | Détection blocage | Enseignant | `GET .../students` |
| 5 | Consentement RGPD | Admin | `POST /api/admin/gdpr/consents` |
| 6 | Onboarding | Élève | `POST /api/eleve/onboarding` |
| 7 | Défi du jour | Élève | `GET /api/eleve/daily-challenge` |
