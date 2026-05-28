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

2) Déployer PostgreSQL + Redis + Backend:

```bash
kubectl -n juggleflow apply -f k8s/10-postgres.yaml
kubectl -n juggleflow apply -f k8s/20-redis.yaml
kubectl -n juggleflow apply -f k8s/30-backend.yaml
```

3) Vérifier:

```bash
kubectl -n juggleflow get pods
kubectl -n juggleflow logs deploy/juggleflow-backend
```

### Notes importantes

- **Secrets**: remplace `k8s/01-secrets.example.yaml` par un vrai secret (SealedSecrets, ExternalSecrets, etc.).
- **Ingress**: ajoute un Ingress adapté à ton infrastructure (TLS, host, CORS origins côté backend).
- **Prod profile**: le backend doit tourner avec `SPRING_PROFILES_ACTIVE=prod` (défaut dans `30-backend.yaml`).

