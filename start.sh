#!/bin/bash

# Battle Card Game - Startup Script
# This script starts both backend and frontend servers

set -e

echo "🎮 Battle Card Game - Starting Application"
echo "=========================================="
echo ""

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
else
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}' || echo "localhost")
fi

# Check if node_modules exist
echo "📦 Checking dependencies..."
if [ ! -d "backend/node_modules" ]; then
    echo "   Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "   Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "✅ Dependencies ready"
echo ""

# Start backend
echo "🚀 Starting backend server..."
cd backend
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "   Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "   ✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ Backend failed to start. Check backend.log for details."
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""

# Start frontend
echo "🚀 Starting frontend server..."
cd frontend
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "   Waiting for frontend to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "   ✅ Frontend is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "   ⚠️  Frontend may still be starting. Check frontend.log for details."
    fi
    sleep 1
done

echo ""
echo "=========================================="
echo "✅ Application is running!"
echo ""
echo "🎮 OPEN THIS URL IN YOUR BROWSER:"
echo ""
echo "   👉  http://$LOCAL_IP:3000"
echo ""
echo "=========================================="
echo ""
echo "📝 View logs: tail -f backend.log  or  tail -f frontend.log"
echo "🛑 To stop: Press Ctrl+C or run ./stop.sh"
echo ""

# Wait for user to press Ctrl+C
trap "echo '' && echo '🛑 Stopping servers...' && kill $BACKEND_PID $FRONTEND_PID 2>/dev/null && echo '✅ Servers stopped' && exit 0" INT TERM

# Keep script running
wait
