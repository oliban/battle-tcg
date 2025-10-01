#!/bin/bash

# Battle Card Game - Stop Script
# This script stops all running backend and frontend servers

echo "🛑 Stopping Battle Card Game servers..."

# Stop backend
pkill -f "node.*dist/server.js" 2>/dev/null && echo "   ✅ Backend stopped" || echo "   ℹ️  No backend process found"

# Stop frontend (React dev server)
pkill -f "react-scripts start" 2>/dev/null && echo "   ✅ Frontend stopped" || echo "   ℹ️  No frontend process found"

# Clean up log files
rm -f backend.log frontend.log 2>/dev/null

echo "✅ All servers stopped"
