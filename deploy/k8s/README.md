# SmartNMS Kubernetes Deployment

Apply the manifests in this order:

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.example.yaml
kubectl apply -f mongo-statefulset.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f hpa.yaml
kubectl apply -f ingress.yaml
```

Replace `secret.example.yaml` values before production use. For enterprise production, prefer managed MongoDB and Redis, sealed secrets, image tags instead of `latest`, and separate worker entrypoints once workers are split from the API process.
