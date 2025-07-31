#!/bin/bash

# FileUI Development Server Manager
# Manages Vite (port 5173) and Python API server (port 8000)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VITE_PORT=5173
PYTHON_PORT=8000
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SERVER="server.py"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Kill processes on specific port
kill_port() {
    local port=$1
    local name=$2
    
    print_status "Checking for existing $name server on port $port..."
    
    # Try multiple methods to find and kill the process
    if command -v lsof &> /dev/null; then
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            echo "$pids" | xargs -r kill -9 2>/dev/null
            print_success "Killed $name server process(es) on port $port"
        else
            print_status "No $name server found on port $port"
        fi
    elif command -v fuser &> /dev/null; then
        fuser -k $port/tcp 2>/dev/null && print_success "Killed $name server on port $port" || print_status "No $name server found on port $port"
    else
        # Fallback method using netstat or ss
        local pid=$(netstat -tlnp 2>/dev/null | grep ":$port" | awk '{print $7}' | cut -d'/' -f1)
        if [ -z "$pid" ]; then
            pid=$(ss -tlnp 2>/dev/null | grep ":$port" | grep -oP 'pid=\K\d+')
        fi
        
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null && print_success "Killed $name server (PID: $pid)" || print_error "Failed to kill $name server"
        else
            print_status "No $name server found on port $port"
        fi
    fi
}

# Kill all servers
kill_all_servers() {
    print_status "Stopping all servers..."
    kill_port $VITE_PORT "Vite"
    kill_port $PYTHON_PORT "Python API"
    
    # Also kill any npm/node processes that might be hanging
    pkill -f "vite" 2>/dev/null
    pkill -f "python.*$PYTHON_SERVER" 2>/dev/null
    
    print_success "All servers stopped"
}

# Check if port is available
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -i:$port &>/dev/null
    elif command -v netstat &> /dev/null; then
        netstat -tln | grep -q ":$port "
    else
        curl -s http://localhost:$port &>/dev/null
    fi
    return $?
}

# Start Vite server
start_vite() {
    print_status "Starting Vite development server on port $VITE_PORT..."
    
    # Check if package.json exists
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        print_error "package.json not found. Please run 'npm init' first."
        return 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        print_warning "node_modules not found. Running npm install..."
        cd "$PROJECT_DIR" && npm install
    fi
    
    # Start Vite in background
    cd "$PROJECT_DIR"
    nohup npm run dev > "$PROJECT_DIR/logs/vite.log" 2>&1 &
    local vite_pid=$!
    
    # Wait a moment for server to start
    sleep 3
    
    if check_port $VITE_PORT; then
        print_success "Vite server started on http://localhost:$VITE_PORT (PID: $vite_pid)"
        echo $vite_pid > "$PROJECT_DIR/logs/vite.pid"
    else
        print_error "Failed to start Vite server"
        return 1
    fi
}

# Start Python server
start_python() {
    print_status "Starting Python API server on port $PYTHON_PORT..."
    
    # Check if server.py exists
    if [ ! -f "$PROJECT_DIR/$PYTHON_SERVER" ]; then
        print_error "$PYTHON_SERVER not found in project directory"
        return 1
    fi
    
    # Start Python server in background
    cd "$PROJECT_DIR"
    nohup python3 "$PYTHON_SERVER" > "$PROJECT_DIR/logs/python.log" 2>&1 &
    local python_pid=$!
    
    # Wait a moment for server to start
    sleep 2
    
    if check_port $PYTHON_PORT; then
        print_success "Python API server started on http://localhost:$PYTHON_PORT (PID: $python_pid)"
        echo $python_pid > "$PROJECT_DIR/logs/python.pid"
    else
        print_error "Failed to start Python API server"
        return 1
    fi
}

# Show server status
show_status() {
    print_status "Server Status:"
    echo ""
    
    # Check Vite
    if check_port $VITE_PORT; then
        print_success "Vite server is running on port $VITE_PORT"
        if [ -f "$PROJECT_DIR/logs/vite.pid" ]; then
            echo "  PID: $(cat $PROJECT_DIR/logs/vite.pid)"
        fi
    else
        print_error "Vite server is not running"
    fi
    
    # Check Python
    if check_port $PYTHON_PORT; then
        print_success "Python API server is running on port $PYTHON_PORT"
        if [ -f "$PROJECT_DIR/logs/python.pid" ]; then
            echo "  PID: $(cat $PROJECT_DIR/logs/python.pid)"
        fi
    else
        print_error "Python API server is not running"
    fi
}

# Show logs
show_logs() {
    local server=$1
    case $server in
        vite)
            if [ -f "$PROJECT_DIR/logs/vite.log" ]; then
                tail -f "$PROJECT_DIR/logs/vite.log"
            else
                print_error "Vite log file not found"
            fi
            ;;
        python)
            if [ -f "$PROJECT_DIR/logs/python.log" ]; then
                tail -f "$PROJECT_DIR/logs/python.log"
            else
                print_error "Python log file not found"
            fi
            ;;
        all)
            if command -v multitail &> /dev/null; then
                multitail "$PROJECT_DIR/logs/vite.log" "$PROJECT_DIR/logs/python.log"
            else
                print_warning "multitail not installed. Showing Vite logs. Press Ctrl+C to see Python logs."
                tail -f "$PROJECT_DIR/logs/vite.log"
                tail -f "$PROJECT_DIR/logs/python.log"
            fi
            ;;
        *)
            print_error "Unknown server: $server"
            echo "Usage: $0 logs [vite|python|all]"
            ;;
    esac
}

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Main script logic
case "$1" in
    start)
        kill_all_servers
        start_vite
        start_python
        echo ""
        print_success "All servers started successfully!"
        echo ""
        echo "  Frontend: http://localhost:$VITE_PORT"
        echo "  API:      http://localhost:$PYTHON_PORT"
        echo ""
        echo "Run '$0 logs all' to see server logs"
        ;;
    
    stop)
        kill_all_servers
        rm -f "$PROJECT_DIR/logs/*.pid"
        ;;
    
    restart)
        $0 stop
        sleep 1
        $0 start
        ;;
    
    status)
        show_status
        ;;
    
    logs)
        show_logs ${2:-all}
        ;;
    
    kill-ports)
        # Emergency kill all processes on our ports
        print_warning "Force killing all processes on ports $VITE_PORT and $PYTHON_PORT..."
        for port in $VITE_PORT $PYTHON_PORT; do
            kill_port $port "Any"
        done
        ;;
    
    *)
        echo "FileUI Development Server Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|kill-ports}"
        echo ""
        echo "Commands:"
        echo "  start      - Kill existing servers and start fresh ones"
        echo "  stop       - Stop all servers"
        echo "  restart    - Restart all servers"
        echo "  status     - Show server status"
        echo "  logs       - Show server logs (vite|python|all)"
        echo "  kill-ports - Force kill anything on ports $VITE_PORT and $PYTHON_PORT"
        echo ""
        echo "Examples:"
        echo "  $0 start           # Start all servers"
        echo "  $0 logs vite       # Show Vite logs"
        echo "  $0 logs all        # Show all logs"
        exit 1
        ;;
esac