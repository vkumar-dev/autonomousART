#!/bin/bash

# autonomousART Loop - Autonomous Art Generator
# Runs every 6 hours, generates art, commits and pushes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INTERVAL_SECONDS=21600  # 6 hours

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Generate new artwork
generate_artwork() {
    log_info "Generating new artwork..."
    
    cd "$PROJECT_DIR"
    
    # Select concept
    if ! node "$SCRIPT_DIR/concept-selector.js"; then
        log_error "Failed to select concept"
        return 1
    fi
    
    # Generate artwork
    if ! node "$SCRIPT_DIR/art-generator.js"; then
        log_error "Failed to generate artwork"
        return 1
    fi
    
    # Build gallery
    if ! node "$SCRIPT_DIR/build-gallery.js"; then
        log_error "Failed to build gallery"
        return 1
    fi
    
    log_success "Artwork generation complete"
    return 0
}

# Commit and push changes
commit_and_push() {
    log_info "Checking for new artworks to commit..."
    
    cd "$PROJECT_DIR"
    
    # Configure git user
    git config user.name "autonomousART Bot" 2>/dev/null || true
    git config user.email "bot@autonomousart.local" 2>/dev/null || true
    
    # Check for changes
    if git status --porcelain | grep -q "artworks/"; then
        # Get artwork name
        ARTWORK=$(git status --porcelain | grep "artworks/" | awk '{print $2}' | xargs -n1 basename | head -1)
        
        # Add and commit
        git add artworks/ artworks-list.json
        git commit -m "🎨 [AUTO] New artwork: $ARTWORK"
        
        log_success "Committed: $ARTWORK"
        
        # Push to remote
        log_info "Pushing to remote repository..."
        if git push origin main 2>/dev/null; then
            log_success "Successfully pushed to remote"
        elif git push origin master 2>/dev/null; then
            log_success "Successfully pushed to remote (master branch)"
        else
            log_warning "Push failed - may need authentication or remote not configured"
            return 1
        fi
    else
        log_info "No new artworks to commit"
    fi
    
    return 0
}

# Check if node is available
check_node() {
    if command -v node &> /dev/null; then
        log_success "Node.js found: $(node --version)"
        return 0
    else
        log_error "Node.js not found in PATH"
        return 1
    fi
}

# Check git configuration
check_git() {
    cd "$PROJECT_DIR"
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not a git repository"
        return 1
    fi
    
    # Check if remote is configured
    if ! git remote -v | grep -q "origin"; then
        log_warning "No remote 'origin' configured. Push will fail until configured."
    fi
    
    log_success "Git repository configured"
    return 0
}

# Main loop
run_loop() {
    log_info "========================================="
    log_info "🎨 autonomousART Loop Starting..."
    log_info "========================================="
    log_info "Project directory: $PROJECT_DIR"
    log_info "Interval: $((INTERVAL_SECONDS / 3600)) hours"
    log_info "========================================="
    
    # Pre-flight checks
    if ! check_node; then
        log_error "Pre-flight check failed: Node.js not available"
        exit 1
    fi
    
    if ! check_git; then
        log_error "Pre-flight check failed: Git not configured"
        exit 1
    fi
    
    log_info "Starting main loop..."
    log_info "Press Ctrl+C to stop"
    log_info "========================================="
    
    # Main loop
    while true; do
        echo ""
        log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_info "🚀 Starting new artwork generation cycle"
        log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Generate artwork
        if generate_artwork; then
            # Commit and push
            commit_and_push
            log_success "Cycle complete! Next run in $((INTERVAL_SECONDS / 3600)) hours"
        else
            log_error "Artwork generation failed"
        fi
        
        # Countdown
        log_info "Sleeping for $((INTERVAL_SECONDS / 3600)) hours..."
        for i in $(seq $((INTERVAL_SECONDS / 60)) -1 1); do
            printf "\r${BLUE}[COUNTDOWN]${NC} Next artwork in %d minutes... " $i
            sleep 60
        done
        echo ""
    done
}

# Handle arguments
case "${1:-run}" in
    run)
        run_loop
        ;;
    once)
        log_info "Running single generation cycle..."
        generate_artwork && commit_and_push
        ;;
    check)
        check_node && check_git
        ;;
    help|--help|-h)
        echo "autonomousART Loop - Autonomous Art Generator"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  run    - Start the continuous loop (default)"
        echo "  once   - Run a single generation cycle"
        echo "  check  - Run pre-flight checks only"
        echo "  help   - Show this help message"
        echo ""
        echo "The loop generates new artwork every 6 hours,"
        echo "commits it to git, and pushes to the remote."
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
