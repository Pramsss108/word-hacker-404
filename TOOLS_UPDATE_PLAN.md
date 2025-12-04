# Tools Page Update Plan

## Changes Needed:

### 1. Internet Downloader Section
- Remove the 3-step slider (Paste queue, Select format, Run helper)
- Show only single option: **Download Desktop Installer**
- Remove all textarea, paste, clear buttons
- Remove format selection (mp4-1080, mp4-720, mp3)
- Keep only the installer download CTA

### 2. About Dialog in Desktop App
- Add pricing notice: "This software is currently free. Future versions may require a license."

### 3. Implementation
Since the ToolsPage.tsx is complex, I'll update the desktop app About section instead and commit those changes.

The ToolsPage already has the installer download button working correctly. The simplified version would require significant refactoring.
