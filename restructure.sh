#!/bin/bash

# Restructure FileUI to make v005 the root directory

set -e  # Exit on error

echo "Starting FileUI restructuring..."

# Check we're in the right directory
if [ ! -d "v005" ]; then
    echo "Error: v005 directory not found. Are you in the FileUI root?"
    exit 1
fi

# Create backup of important docs
echo "Backing up important documentation..."
if [ -d "docs/plans" ] && [ ! -d "v005/docs/plans" ]; then
    cp -r docs/plans v005/docs/
fi

# Move v005 contents to root (excluding some directories)
echo "Moving v005 contents to root..."
for item in v005/*; do
    filename=$(basename "$item")
    
    # Skip if it's one of the special directories/files we handle separately
    if [[ "$filename" == "docs" ]] || [[ "$filename" == "node_modules" ]] || [[ "$filename" == "dist" ]] || [[ "$filename" == "logs" ]]; then
        echo "  Handling $filename separately..."
        continue
    fi
    
    # Skip hidden files for now
    if [[ "$filename" == .* ]]; then
        continue
    fi
    
    # Move the item
    if [ -e "$filename" ]; then
        echo "  Conflict found: $filename already exists in root"
        # For now, v005 version takes precedence
        rm -rf "$filename"
    fi
    
    echo "  Moving $filename..."
    mv "$item" .
done

# Handle hidden files
echo "Moving hidden files..."
for item in v005/.*; do
    filename=$(basename "$item")
    if [[ "$filename" != "." ]] && [[ "$filename" != ".." ]]; then
        if [ -e "$filename" ]; then
            rm -rf "$filename"
        fi
        mv "$item" .
    fi
done

# Merge docs directories
echo "Merging docs directories..."
if [ -d "v005/docs" ]; then
    cp -r v005/docs/* docs/ 2>/dev/null || true
    rm -rf v005/docs
fi

# Move remaining special directories
echo "Moving special directories..."
for dir in node_modules dist logs; do
    if [ -d "v005/$dir" ]; then
        if [ -d "$dir" ]; then
            rm -rf "$dir"
        fi
        mv "v005/$dir" .
    fi
done

# Remove old directories
echo "Removing old version directories..."
rm -rf v001 v003 v004 main

# Remove old files that were replaced
echo "Cleaning up old files..."
# Keep the git directory and any .git* files
find . -maxdepth 1 -type f -name "*.html" -o -name "*.css" -o -name "*.js" | grep -v "^\./\." | xargs rm -f 2>/dev/null || true

# Remove now-empty v005 directory
echo "Removing empty v005 directory..."
rmdir v005

# Clean up screenshots and images in root
echo "Cleaning up loose images..."
rm -f *.png *.jpg *.jpeg *.gif *.webp 2>/dev/null || true

echo ""
echo "Restructuring complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes with 'git status'"
echo "2. Test the dev server with './devserver.sh start'"
echo "3. Commit the changes"
echo "4. Update any CI/CD configurations if needed"