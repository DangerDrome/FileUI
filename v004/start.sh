#!/bin/bash

echo "Starting FileUI Server..."
echo ""
echo "Choose server type:"
echo "1) Python server (port 8000)"
echo "2) Node.js server (port 8080) - requires Node.js"
echo "3) Express server (port 3000) - requires Node.js & Express"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "Starting Python server..."
        python3 server.py
        ;;
    2)
        echo "Starting Node.js server..."
        node server.js
        ;;
    3)
        echo "Starting Express server..."
        echo "Installing Express if needed..."
        npm install express
        node server-express.js
        ;;
    *)
        echo "Invalid choice. Starting Python server by default..."
        python3 server.py
        ;;
esac