#!/bin/bash
# Start script for FileUI v005

echo "Starting FileUI v005..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start Python server in background
echo "Starting Python API server on port 8000..."
python server.py --port 8000 &
SERVER_PID=$!

# Give server a moment to start
sleep 2

# Start Vite dev server
echo "Starting Vite dev server on port 3000..."
echo ""
npm run dev

# When Vite exits, kill the Python server
kill $SERVER_PID 2>/dev/null