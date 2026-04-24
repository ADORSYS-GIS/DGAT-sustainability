#!/bin/bash

# Performance Diagnostic Script for Sustainability Tool
# This script helps identify performance bottlenecks in the VM and containers

echo "🔍 SUSTAINABILITY TOOL PERFORMANCE DIAGNOSTICS"
echo "=============================================="
echo ""

# Check system resources
echo "📊 SYSTEM RESOURCES:"
echo "-------------------"
echo "Memory Usage:"
free -h
echo ""
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2 $3 $4 $5 $6 $7 $8}'
echo ""
echo "Disk Usage:"
df -h
echo ""
echo "Load Average:"
uptime
echo ""

# Check Docker resources
echo "🐳 DOCKER CONTAINER STATUS:"
echo "---------------------------"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
echo ""

# Check container logs for errors
echo "📋 CONTAINER HEALTH STATUS:"
echo "---------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check for pending operations in the application
echo "⏳ CHECKING FOR PENDING OPERATIONS:"
echo "-----------------------------------"

# Check if backend is responding
echo "Backend Health Check:"
if curl -s -f http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Backend is responding"
else
    echo "❌ Backend is not responding"
fi

# Check if frontend is responding
echo "Frontend Health Check:"
if curl -s -f http://localhost:8443/health > /dev/null 2>&1; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding"
fi

# Check database connections
echo ""
echo "🗄️  DATABASE STATUS:"
echo "-------------------"
echo "PostgreSQL (App) connections:"
docker exec sustainability-db psql -U postgres -d sustainability -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "❌ Cannot connect to app database"

echo "PostgreSQL (Keycloak) connections:"
docker exec sustainability-keycloak-db psql -U postgres -d keycloak -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "❌ Cannot connect to keycloak database"

# Check for long-running queries
echo ""
echo "Long-running queries (>30 seconds):"
docker exec sustainability-db psql -U postgres -d sustainability -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds' AND state = 'active';" 2>/dev/null || echo "❌ Cannot check long-running queries"

# Check network connectivity
echo ""
echo "🌐 NETWORK CONNECTIVITY:"
echo "------------------------"
echo "Internal container connectivity:"
docker exec sustainability-frontend curl -s -f http://backend:3001/health > /dev/null 2>&1 && echo "✅ Frontend -> Backend: OK" || echo "❌ Frontend -> Backend: FAILED"
docker exec sustainability-backend curl -s -f http://keycloak:8080/keycloak/health > /dev/null 2>&1 && echo "✅ Backend -> Keycloak: OK" || echo "❌ Backend -> Keycloak: FAILED"

# Check for resource limits
echo ""
echo "🚧 RESOURCE LIMITS:"
echo "------------------"
echo "Docker containers are running WITHOUT resource limits!"
echo "This can cause resource contention and performance issues."
echo ""

# Recommendations
echo "💡 RECOMMENDATIONS:"
echo "------------------"
echo "1. Add resource limits to Docker Compose"
echo "2. Monitor container resource usage"
echo "3. Check VM specifications (CPU, RAM, Disk)"
echo "4. Consider scaling up VM if needed"
echo "5. Optimize database queries"
echo "6. Clear browser cache and IndexedDB"
echo ""

# Check VM specifications
echo "🖥️  VM SPECIFICATIONS:"
echo "---------------------"
echo "CPU Cores: $(nproc)"
echo "Total RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Available RAM: $(free -h | awk '/^Mem:/ {print $7}')"
echo "Disk Space: $(df -h / | awk 'NR==2 {print $2 " total, " $4 " available"}')"
echo ""

echo "🔍 DIAGNOSIS COMPLETE"
echo "===================="
echo "If you see high CPU/Memory usage or many pending operations,"
echo "consider optimizing resource allocation or scaling up your VM."