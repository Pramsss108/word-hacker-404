# Word Hacker 404 - Copilot Instructions

## Project Overview
**Word Hacker 404** is an AI-powered word game application built with React, TypeScript, and Vite. This is a completely separate project from any other codebase and should be treated independently.

**🚨 CRITICAL: This project is COMPLETELY SEPARATE from BongBari or any other projects. Never mix code or configurations between projects.**

## Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: CSS3 with modern features (backdrop-filter, gradients)
- **Icons**: Lucide React
- **Port**: Development server runs on `http://localhost:3001` (auto-selected if 3000 busy)
- **Build Tool**: Vite with hot module replacement
- **Deployment**: GitHub Pages with auto-deployment on push

## 🎯 **Non-Coder Development Workflow**

### **Working with AI Agents - IMPORTANT GUIDELINES**

**⚠️ AGENT AWARENESS:**
- **User is non-coder**: Explain technical concepts simply
- **User suggestions may be wrong**: Always analyze requests before implementing
- **Don't blindly follow**: Validate suggestions against project architecture
- **Project-specific analysis**: Consider Word Hacker 404's specific needs and structure
- **Cross-project contamination**: NEVER mix with BongBari or other project patterns

**🤝 COLLABORATION TONE:**
- **Be patient and educational**: Explain why certain approaches work better
- **Offer alternatives**: "Your idea could work, but here's a better approach because..."
- **Validate before acting**: "Let me check if this fits our project structure first"
- **Be honest about limitations**: "This might cause issues because..."
- **Guide toward best practices**: Suggest improvements while respecting user goals

## 🚀 **Development Setup & Workflow**

### **Starting Local Development (Every Time)**

**📁 Navigate to Project:**
```powershell
cd "D:\A scret project\Word hacker 404"
```

**🔧 Install Dependencies (if needed):**
```powershell
npm install
```

**🌐 Start Development Server:**
```powershell
npm run dev
```
- **URL**: `http://localhost:3001` (or next available port)
- **Auto-reload**: Changes reflect immediately
- **Separate from BongBari**: Won't interfere with other projects

**✅ Verify Everything Works:**
- Check TypeScript: `npm run type-check`
- Test build: `npm run build`
- Run development: `npm run dev`

### **Development Commands Reference**

```powershell
# Essential Commands
npm run dev          # Start development server (port 3001)
npm run build        # Create production build
npm run preview      # Preview production build
npm run type-check   # TypeScript validation
npm run lint         # Code quality check

# Git Workflow
git add .                                    # Stage changes
git commit -m "feat: add new feature"       # Commit with message
git push                                     # Deploy to live site automatically

# Troubleshooting
npm ci                    # Clean install if issues
rm -rf node_modules && npm install  # Full dependency reset
```

## 🏗️ **Project Architecture**

### **File Structure (Critical for Agents)**
```
Word Hacker 404/
├── .github/
│   ├── workflows/deploy.yml     # Auto-deployment to GitHub Pages
│   └── copilot-instructions.md  # This file
├── src/
│   ├── App.tsx                  # Main application component
│   ├── App.css                  # Application styles
│   ├── main.tsx                 # Application entry point
│   └── index.css                # Global styles
├── package.json                 # Dependencies and scripts
├── vite.config.ts              # Vite configuration (GitHub Pages)
├── tsconfig.json               # TypeScript configuration
├── index.html                  # HTML template
└── README.md                   # Project documentation
```

### **Key Configuration Files**

**vite.config.ts - CRITICAL SETTINGS:**
```typescript
base: '/word-hacker-404/',  # GitHub Pages path - NEVER CHANGE
server: { port: 3000 },     # Development port
build: { outDir: 'dist' }   # Build output directory
```

**package.json - ESSENTIAL SCRIPTS:**
- `dev`: Development server
- `build`: Production build for deployment
- `type-check`: TypeScript validation

## 🚀 **Auto-Deployment System**

### **How Deployment Works**
1. **Push to main branch** → **GitHub Actions triggers**
2. **Runs build process** → **Deploys to GitHub Pages**
3. **Live site updates** → **Available at https://pramsss108.github.io/word-hacker-404/**

### **Deployment Workflow (.github/workflows/deploy.yml)**
- **Trigger**: Every push to main
- **Process**: Install → Build → Deploy to gh-pages branch
- **Result**: Live site automatically updated
- **Time**: 2-3 minutes for deployment completion

### **Live Site Management**
- **URL**: `https://pramsss108.github.io/word-hacker-404/`
- **Privacy**: Repository private, site public via link
- **Updates**: Automatic on every push
- **Status**: Check GitHub Actions tab for deployment status

## 🎮 **Game Features & Architecture**

### **Current Implementation**
1. **Main Menu**: Game mode selection and stats display
2. **Word Detective Mode**: Primary game mode (framework ready for AI)
3. **Pattern Hunter**: Placeholder for future implementation
4. **Speed Challenge**: Placeholder for future implementation
5. **Responsive UI**: Works on mobile and desktop
6. **Modern Styling**: Glass-morphism with animations

### **AI Integration Ready**
- Component structure prepared for AI API integration
- State management ready for dynamic content
- UI framework supports real-time updates
- Modular design for easy feature addition

## 🔧 **Agent Development Guidelines**

### **Before Making Changes**
1. **Understand the request**: Ask clarifying questions if unclear
2. **Analyze project impact**: Consider how changes affect existing code
3. **Check dependencies**: Ensure new features don't conflict
4. **Validate with user**: Explain approach before implementing
5. **Test thoroughly**: Run type-check and build before pushing

### **Code Quality Standards**
- **TypeScript**: Maintain strict typing for all components
- **React patterns**: Use functional components with hooks
- **CSS organization**: Keep styles modular and maintainable
- **Performance**: Optimize for fast loading and smooth interactions
- **Accessibility**: Ensure keyboard navigation and screen reader support

### **Common Non-Coder Requests & Responses**

**"Add AI features"** → Analyze: What type of AI? API integration? Local processing?
**"Make it look better"** → Clarify: Specific visual elements? Color scheme? Layout?
**"Fix the game"** → Investigate: What's broken? Error messages? Functionality?
**"Add new mode"** → Plan: Game mechanics? UI changes? State management needs?

### **Red Flags to Watch For**
- ❌ Requests to copy code from BongBari project
- ❌ Suggestions that break TypeScript compilation
- ❌ Changes that affect deployment configuration
- ❌ Modifications to core Vite/React setup without clear benefit
- ❌ Adding heavy dependencies without justification

## 🚨 **Emergency Troubleshooting**

### **Site Not Loading After Push**
1. **Check GitHub Actions**: Look for failed deployments
2. **Verify build**: Run `npm run build` locally
3. **Check console**: Browser DevTools for errors
4. **Force refresh**: Ctrl+F5 to clear cache

### **Development Server Issues**
1. **Port conflicts**: Vite will auto-select available port
2. **Dependency issues**: Run `npm ci` for clean install
3. **TypeScript errors**: Fix before proceeding with features
4. **Cache problems**: Clear browser cache and restart dev server

### **Deployment Failures**
1. **Check workflow permissions**: GitHub Actions needs write access
2. **Verify gh-pages branch**: Should be auto-created by workflow
3. **Build errors**: Fix TypeScript/build issues first
4. **Repository settings**: Ensure GitHub Pages points to gh-pages branch

## 🎯 **Future Development Roadmap**

### **Planned Features**
- AI-powered word generation and hints
- Multiple difficulty levels
- User authentication and progress saving
- Multiplayer capabilities
- Sound effects and animations
- Achievement system and leaderboards

### **Technical Improvements**
- Performance optimization
- Enhanced accessibility
- Progressive Web App features
- Offline capability
- Analytics integration

## 💡 **Agent Collaboration Best Practices**

### **Communication Style**
- **Be educational**: Explain technical decisions
- **Offer choices**: Present multiple solutions with pros/cons
- **Validate understanding**: Confirm user intentions before implementing
- **Document changes**: Update this file when adding major features
- **Stay project-focused**: Keep solutions specific to Word Hacker 404's needs

### **Development Philosophy**
- **User-centric**: Prioritize user experience over technical complexity
- **Maintainable**: Write code that's easy to understand and modify
- **Scalable**: Design for future feature additions
- **Reliable**: Ensure stability before adding new functionality
- **Documented**: Keep instructions updated for future agents

---

**Last Updated**: October 17, 2025 - Initial setup and auto-deployment complete
**Status**: Production ready with auto-deployment active
**Live Site**: https://pramsss108.github.io/word-hacker-404/

**This project represents a complete, modern web application showcasing AI-powered gaming capabilities with professional deployment practices.**