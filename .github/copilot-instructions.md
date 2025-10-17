# Word Hacker 404 - Copilot Instructions

## Project Overview
**Word Hacker 404** is an AI-powered word game application built with React, TypeScript, and Vite. This is a completely separate project from any other codebase and should be treated independently.

## Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: CSS3 with modern features (backdrop-filter, gradients)
- **Icons**: Lucide React
- **Port**: Development server runs on `http://localhost:3000`
- **Build Tool**: Vite with hot module replacement

## Project Structure
```
Word Hacker 404/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── index.html           # HTML template
└── README.md           # Project documentation
```

## Development Guidelines

### Code Style
- Use TypeScript for all React components
- Follow React functional component patterns with hooks
- Use modern CSS features (Grid, Flexbox, custom properties)
- Implement responsive design for mobile compatibility
- Use semantic HTML elements for accessibility

### Component Architecture
- Keep components small and focused
- Use props and state management appropriately
- Implement proper TypeScript typing for all props and state
- Follow React best practices for performance

### Styling Approach
- CSS Modules or styled-components preferred
- Use CSS custom properties for theming
- Implement consistent spacing and typography
- Mobile-first responsive design
- Modern CSS features (backdrop-filter, grid, flex)

## Available Scripts
- `npm run dev` - Start development server (port 3000)
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## Game Features (Current)
1. **Main Menu**: Game mode selection and stats display
2. **Word Detective Mode**: Primary game mode (framework ready)
3. **Pattern Hunter**: Placeholder for future implementation
4. **Speed Challenge**: Placeholder for future implementation

## Game Features (Planned)
- AI-powered word generation and hints
- Multiple difficulty levels
- Score tracking and leaderboards
- User authentication and progress saving
- Sound effects and animations
- Multiplayer capabilities

## Development Workflow
1. Always run `npm install` after pulling changes
2. Start development server with `npm run dev`
3. Run type checking before committing: `npm run type-check`
4. Build and test before deploying: `npm run build && npm run preview`

## Port Configuration
- **Development**: `http://localhost:3000` (configured in vite.config.ts)
- **Preview**: `http://localhost:4173` (Vite default for preview)
- **Production**: Deploy `dist/` folder to any static hosting

## Integration Notes
- This project is completely independent of BongBari or any other projects
- Can run simultaneously with other projects on different ports
- Has its own package.json, dependencies, and configuration files
- Should have its own Git repository and deployment pipeline

## AI Integration (Future)
- Plan to integrate with AI APIs for word generation
- Implement content moderation for user-generated content
- Add intelligent difficulty adjustment based on player performance
- Create AI opponents for competitive modes

## Deployment Strategy
- Build static files with `npm run build`
- Deploy `dist/` folder to GitHub Pages, Netlify, or Vercel
- Configure custom domain if needed
- Set up CI/CD pipeline for automatic deployments

## Testing Strategy (Future)
- Add unit tests for game logic components
- Implement integration tests for user interactions
- Add end-to-end tests for complete game flows
- Performance testing for smooth gameplay

## Troubleshooting
- If port 3000 is in use, Vite will automatically use next available port
- TypeScript errors should be resolved before building
- Check browser console for runtime errors during development
- Use `npm run lint` to catch common code issues

## Contributing Guidelines
- Follow TypeScript best practices
- Implement proper error handling
- Add JSDoc comments for complex functions
- Test on multiple browsers and devices
- Maintain consistent code formatting

---

This project is designed to be a standalone, modern web application showcasing AI-powered gaming capabilities.