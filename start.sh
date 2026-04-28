#!/bin/bash

# Start Trippla dev environment
# Usage: ./start.sh

echo "Starting Trippla dev environment..."

# Start Prisma Postgres in the background
echo "Starting Prisma Postgres..."
npx prisma dev &
PRISMA_PID=$!

# Wait for Prisma to be ready
echo "Waiting for database..."
for i in {1..30}; do
  if curl -s -o /dev/null http://localhost:51213 2>/dev/null; then
    echo "Database ready!"
    break
  fi
  sleep 1
done

# Start Next.js dev server
echo "Starting Next.js dev server..."
npm run dev &
NEXT_PID=$!

echo ""
echo "Trippla is running!"
echo "  PC:    http://localhost:3000"
echo "  Phone: http://192.168.31.50:3000"
echo ""
echo "Press Ctrl+C to stop all services."

# Handle Ctrl+C - kill both processes
trap "echo 'Shutting down...'; kill $PRISMA_PID $NEXT_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait for either process to exit
wait
