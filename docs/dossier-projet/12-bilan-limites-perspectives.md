# 12 — Bilan, limites et perspectives

**Sources :** README analyse-projet, RNCP6-TESTS, inspection code (écarts documentés). Aucune perspective inventée hors prolongements logiques des limites déjà constatées.

---

## 1. Bilan fonctionnel

JuggleFlow, **dans son état de code actuel**, constitue une application multi-rôles complète pour le contexte scolaire :

- PWA élève (catalogue, pratique, parcours, badges, offline) ;
- espace enseignant (classe, groupes, blocages, assignations, CSV) ;
- espace admin (users, classes, licence, RGPD, audit) ;
- API sécurisée JWT + Redis ;
- environnement Podman reproductible ;
- batterie de tests unitaires / intégration / E2E + CI.

Le PDF produit a servi de **cadrage métier** (personas, socle commun, pack école). Le produit logiciel dépasse le MVP marketing annoncé (1 parcours / 8 exercices).

---

## 2. Bilan technique (alignement CDA)

| AT | Contribution du projet |
|----|------------------------|
| AT1 | UI sécurisée multi-rôles, composants métier riches, environnement Podman, gestion de projet via monorepo + CI |
| AT2 | Analyse besoins/personas, architecture en couches, PostgreSQL + Flyway, Redis technique |
| AT3 | Plans de tests documentés, Compose/K8s documentés, CI/scans DevOps |

---

## 3. Limites connues (ne pas dissimuler)

| Limite | Preuve |
|--------|--------|
| `practice_session` non alimentée par l’UI chronomètre | `docs/analyse-projet/README.md` |
| XP / rangs non persistés ; rang Bronze constant en UI | pages élève + README analyse |
| Pas de Background Sync Workbox autonome | `offlineQueue` + `AuthContext` |
| Pas d’E2E offline PWA | `docs/RNCP6-TESTS.md` |
| OAuth Google / ENT non implémentés | `LoginPage` |
| Inscription publique désactivée en prod (volontaire) | `ProdSafetyChecks` |
| Admin users ≠ CRUD complet (pas d’édition/suppression UI) | `AdminUsersPage` |
| Filtre catégorie catalogue absent | `CataloguePage` |
| Scans Trivy / dependency-review non bloquants | workflows |
| Pas de CD Kubernetes | absence workflow deploy |
| Incohérence secret CronJob backup K8s | `41-postgres-backup-cronjob.yaml` vs `01-secrets.example.yaml` |
| Droits RGPD self-service (accès/portabilité/suppression) absents | inspection backend |
| Postgres 16 (tests TC) vs 17 (Compose/CI) | configs |

---

## 4. Perspectives (uniquement prolongements des limites)

Formulées comme **pistes**, non comme fonctionnalités livrées :

1. Persister les sessions de pratique UI vers `practice_session`.  
2. Persister XP/rangs côté serveur si le métier le requiert.  
3. E2E offline PWA.  
4. Corriger le secret CronJob backup + documenter une procédure de restore testée.  
5. Rendre bloquants certains scans container/dépendances en CI.  
6. Clarifier l’hébergement frontend en production.  
7. Intégration ENT si partenariat établissement.

Toute autre évolution marketing non ancrée dans le code reste hors dossier.

---

## 5. Éléments encore à fournir par le candidat

| Élément | Statut |
|---------|--------|
| Captures UI runtime live (login, dashboards) | `[À COMPLÉTER]` — wireframes fournis en attendant |
| Captures GitHub Actions vertes | `[À COMPLÉTER]` |
| Rapport de tests chiffré (dernière exécution) | `[À COMPLÉTER]` |
| Exports images Mermaid (MCD, CU, séquences) | Générables depuis `docs/analyse-projet/` |
| Identité candidat / centre / dates examen | `[À COMPLÉTER]` page de garde |
| Preuve déploiement K8s réel (si revendiqué à l’oral) | Non présent → ne pas revendiquer |

---

## 6. Conclusion

Le projet démontre, preuves à l’appui, la capacité à **concevoir, développer, sécuriser, tester et préparer le déploiement** d’une application web professionnelle orientée établissement scolaire. La transparence sur les limites (sessions, gamification UI, CD) renforce la crédibilité du dossier RNCP6.
