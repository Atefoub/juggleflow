## JuggleFlow — Kubernetes manifests (minimal)

Ces manifests sont un **point de départ** pour un déploiement "prod-ready" (API stateless + PostgreSQL + Redis).

### Pré-requis

- Un cluster Kubernetes
- Un contrôleur Ingress (optionnel, sinon exposer via `kubectl port-forward`/LoadBalancer)
- Un StorageClass par défaut (pour les PVC Postgres)

### Déploiement rapide

1) Créer le namespace et les secrets (exemples):

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl -n juggleflow apply -f k8s/01-secrets.example.yaml
```

2) Déployer PostgreSQL + Redis + Backend (+ sauvegardes / ingress optionnels) :

```bash
kubectl -n juggleflow apply -f k8s/10-postgres.yaml
kubectl -n juggleflow apply -f k8s/20-redis.yaml
kubectl -n juggleflow apply -f k8s/30-backend.yaml
# optionnel :
# kubectl -n juggleflow apply -f k8s/40-ingress.yaml
# kubectl -n juggleflow apply -f k8s/41-postgres-backup-cronjob.yaml
```

3) Vérifier:

```bash
kubectl -n juggleflow get pods
kubectl -n juggleflow logs deploy/juggleflow-backend
```

### Notes importantes

- **Secrets**: remplace `k8s/01-secrets.example.yaml` par un vrai secret (SealedSecrets, ExternalSecrets, etc.).
- **Ingress**: exemple `k8s/40-ingress.yaml` (adapter host + TLS).
- **Backups**: CronJob exemple `k8s/41-postgres-backup-cronjob.yaml` — tester une restauration hors prod.
- **Inscription publique**: désactivée en profil `prod` ; comptes via console admin uniquement.
- **Prod profile**: le backend doit tourner avec `SPRING_PROFILES_ACTIVE=prod` (défaut dans `30-backend.yaml`).

