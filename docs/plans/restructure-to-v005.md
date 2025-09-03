# Project Restructuring Plan: Make v005 the Root

## Overview
Moving all v005 contents to the root directory and removing legacy versions.

## Current Structure
```
FileUI/
├── CLAUDE.md (old)
├── README.md (old)
├── v001/
├── v003/
├── v004/
├── main/
├── docs/
└── v005/ (current active version)
    ├── All current project files
    └── CLAUDE.md (updated)
```

## Target Structure
```
FileUI/
├── All v005 contents moved to root
├── docs/ (keep existing + v005/docs merged)
└── archive/ (optional - to preserve old versions)
```

## Steps

1. **Backup Important Files**
   - Keep docs/plans/ content
   - Preserve any unique documentation

2. **Move v005 Contents to Root**
   - Move all files from v005/ to parent directory
   - Handle conflicts carefully

3. **Clean Up**
   - Remove v001, v003, v004, main directories
   - Remove old root files that are replaced by v005 versions

4. **Update Configurations**
   - Update any paths in configuration files
   - Ensure build scripts still work

5. **Test**
   - Run dev server
   - Verify all functionality works

## Files to Keep from Root
- docs/plans/ (has planning documents)
- .git/ (version control)
- Any unique documentation not in v005

## Files to Remove/Replace
- Old CLAUDE.md (replace with v005 version)
- Old README.md (if v005 has one)
- All v00X directories
- main/ directory
- Duplicate files

## Risks & Mitigation
- Git history will show large changes
- Ensure no active branches depend on old structure
- Test thoroughly after restructuring