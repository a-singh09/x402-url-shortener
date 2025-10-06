#!/bin/bash

# URL Shortener x402 Deployment Script
set -e

echo "🚀 Starting URL Shortener x402 deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("BUSINESS_WALLET_ADDRESS" "DATABASE_URL" "POSTGRES_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build and start services
echo "🔨 Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout=120
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo "✅ Services are healthy"
        break
    fi
    
    if [ $counter -eq $timeout ]; then
        echo "❌ Services failed to become healthy within ${timeout} seconds"
        docker-compose logs
        exit 1
    fi
    
    echo "⏳ Waiting for services... ($counter/$timeout)"
    sleep 5
    counter=$((counter + 5))
done

# Test the deployment
echo "🧪 Testing deployment..."
sleep 10

# Test health endpoint
if curl -f http://localhost:${PORT:-3000}/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    docker-compose logs app
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "🌐 Application is running at http://localhost:${PORT:-3000}"
echo "🔗 Health check: http://localhost:${PORT:-3000}/health"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"