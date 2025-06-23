#!/bin/bash
echo "🚀 Deploying DGRV Digital Tools to Kubernetes..."

# Apply Kubernetes manifests
kubectl apply -f infrastructure/k8s/deployments/
kubectl apply -f infrastructure/k8s/services/
kubectl apply -f infrastructure/k8s/ingress/

echo "✅ Deployment complete!"
