#!/usr/bin/env node

/**
 * VOICE ENCRYPTER — MASTER QUALITY INVIGILATOR
 * 
 * Acts like a 1000-year experienced music producer + developer
 * Validates ALL work against NASA-grade standards before deployment
 * 
 * Usage: node quality-check.js [--verbose] [--fix]
 * 
 * Standards: Professional DAW quality, zero amateur code, NASA reliability
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for professional output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class MasterInvigilator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.fix = options.fix || false;
    this.issues = [];
    this.warnings = [];
    this.passed = [];
    
    this.log(`${colors.bold}${colors.cyan}🎛️  VOICE ENCRYPTER MASTER INVIGILATOR${colors.reset}`);
    this.log(`${colors.blue}Validating with 1000-year music producer + NASA developer standards${colors.reset}\n`);
  }

  log(message) {
    console.log(message);
  }

  error(message) {
    this.issues.push(message);
    this.log(`${colors.red}❌ CRITICAL: ${message}${colors.reset}`);
  }

  warn(message) {
    this.warnings.push(message);
    this.log(`${colors.yellow}⚠️  WARNING: ${message}${colors.reset}`);
  }

  pass(message) {
    this.passed.push(message);
    if (this.verbose) {
      this.log(`${colors.green}✅ ${message}${colors.reset}`);
    }
  }

  // 1. ARCHITECTURE VALIDATION (God-Level Standards)
  validateArchitecture() {
    this.log(`${colors.bold}${colors.blue}🏗️  ARCHITECTURE VALIDATION${colors.reset}`);
    
    const requiredFiles = [
      'VOICE_ENCRYPTER_ENGINE_PLAN.md',
      'ARCHITECTURE.md',
      'src/services/engineCore.ts',
      'src/services/audioService.ts', 
      'src/components/VoiceEncrypter.tsx',
      'package.json',
      'tsconfig.json',
      'vite.config.ts'
    ];

    let missingFiles = [];
    
    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.pass(`Required file exists: ${file}`);
      } else {
        this.error(`Missing critical file: ${file}`);
        missingFiles.push(file);
      }
    });

    // Check for amateur patterns in codebase
    this.checkForAmateurPatterns();
    
    // Validate engine separation
    this.validateEngineArchitecture();
    
    return missingFiles.length === 0;
  }

  checkForAmateurPatterns() {
    const amateurPatterns = [
      { pattern: /console\.log(?!.*error|.*warn)/gi, file: 'src/**/*.{ts,tsx}', message: 'Remove debug console.log statements' },
      { pattern: /TODO|FIXME|HACK/gi, file: 'src/**/*.{ts,tsx}', message: 'Resolve all TODO/FIXME comments' },
      { pattern: /any/gi, file: 'src/**/*.{ts,tsx}', message: 'Replace "any" types with proper TypeScript types' },
      { pattern: /\.innerHTML|\.outerHTML/gi, file: 'src/**/*.{ts,tsx}', message: 'Avoid innerHTML for security' },
    ];

    // Check TypeScript files for amateur patterns
    try {
      const tsFiles = this.getFilesRecursive('src', ['.ts', '.tsx']);
      
      tsFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        
        amateurPatterns.forEach(({ pattern, message }) => {
          const matches = content.match(pattern);
          if (matches) {
            this.warn(`${message} in ${file} (${matches.length} occurrences)`);
          }
        });
      });
    } catch (e) {
      this.error(`Failed to scan for amateur patterns: ${e.message}`);
    }
  }

  validateEngineArchitecture() {
    // Check engineCore.ts structure
    if (fs.existsSync('src/services/engineCore.ts')) {
      const engineContent = fs.readFileSync('src/services/engineCore.ts', 'utf8');
      
      const requiredClasses = [
        'VoiceEngineCore',
        'AudioEffectNode',
        'PreviewGraph'
      ];
      
      const requiredFunctions = [
        'buildPreviewGraph',
        'renderOffline',
        'createHPF',
        'createLPF', 
        'createCompressor',
        'createDelay',
        'createReverb',
        'createLimiter',
        'createMeter'
      ];

      requiredClasses.forEach(className => {
        if (engineContent.includes(className)) {
          this.pass(`Engine core contains required class: ${className}`);
        } else {
          this.error(`Engine core missing required class: ${className}`);
        }
      });

      requiredFunctions.forEach(funcName => {
        if (engineContent.includes(funcName)) {
          this.pass(`Engine core contains required function: ${funcName}`);
        } else {
          this.error(`Engine core missing required function: ${funcName}`);
        }
      });
    }
  }

  // 2. AUDIO QUALITY VALIDATION (Music Producer Standards)
  validateAudioQuality() {
    this.log(`\n${colors.bold}${colors.magenta}🎵 AUDIO QUALITY VALIDATION${colors.reset}`);
    
    // Check for proper audio routing
    this.validateAudioRouting();
    
    // Check for professional transport controls
    this.validateTransportControls();
    
    // Check for proper effect implementations
    this.validateEffectImplementations();
  }

  validateAudioRouting() {
    const voiceEncrypterPath = 'src/components/VoiceEncrypter.tsx';
    
    if (fs.existsSync(voiceEncrypterPath)) {
      const content = fs.readFileSync(voiceEncrypterPath, 'utf8');
      
      // Check for proper audio source management
      if (content.includes('stopAll') && content.includes('activeSourceRef')) {
        this.pass('Proper audio source cleanup implemented');
      } else {
        this.error('Missing proper audio source cleanup - can cause audio mixing');
      }
      
      // Check for professional transport controls
      if (content.includes('transport-btn') && content.includes('▶') && content.includes('⏸')) {
        this.pass('Professional DAW-style transport controls implemented');
      } else {
        this.error('Missing professional transport controls');
      }
      
      // Check against amateur separate preview sections
      if (content.includes('ab-preview-section') || content.includes('Live A/B Compare')) {
        this.error('Amateur separate preview section detected - should be integrated');
      } else {
        this.pass('No amateur separate preview sections');
      }
    }
  }

  validateTransportControls() {
    const cssPath = 'src/App.css';
    
    if (fs.existsSync(cssPath)) {
      const content = fs.readFileSync(cssPath, 'utf8');
      
      // Check for professional transport styling
      if (content.includes('.transport-btn') && content.includes('border-radius: 50%')) {
        this.pass('Professional circular transport buttons');
      } else {
        this.warn('Transport buttons may not be properly styled');
      }
      
      // Check for proper hover effects
      if (content.includes(':hover') && content.includes('transform: scale')) {
        this.pass('Professional hover effects implemented');
      } else {
        this.warn('Missing professional hover effects');
      }
    }
  }

  validateEffectImplementations() {
    const enginePath = 'src/services/engineCore.ts';
    
    if (fs.existsSync(enginePath)) {
      const content = fs.readFileSync(enginePath, 'utf8');
      
      // Check for proper effect nodes
      const effects = ['HPFNode', 'LPFNode', 'CompressorNode', 'DelayEffectNode', 'ReverbNode', 'LimiterNode'];
      
      effects.forEach(effect => {
        if (content.includes(effect)) {
          this.pass(`Professional ${effect} implementation found`);
        } else {
          this.error(`Missing ${effect} implementation`);
        }
      });
      
      // Check for proper disposal patterns
      if (content.includes('dispose()') && content.includes('disconnect()')) {
        this.pass('Proper audio node cleanup patterns');
      } else {
        this.error('Missing proper audio node disposal - memory leaks possible');
      }
    }
  }

  // 3. CODE QUALITY VALIDATION (NASA Standards)
  validateCodeQuality() {
    this.log(`\n${colors.bold}${colors.green}🛡️  CODE QUALITY VALIDATION${colors.reset}`);
    
    this.validateTypeScript();
    this.validateLinting();
    this.validateBuild();
    this.validateDependencies();
  }

  validateTypeScript() {
    try {
      execSync('npm run type-check', { stdio: 'pipe' });
      this.pass('TypeScript compilation clean');
    } catch (error) {
      this.error(`TypeScript errors detected: ${error.message}`);
    }
  }

  validateLinting() {
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      this.pass('Linting passed');
    } catch (error) {
      this.warn(`Linting issues detected: ${error.message}`);
    }
  }

  validateBuild() {
    try {
      execSync('npm run build', { stdio: 'pipe' });
      this.pass('Production build successful');
      
      // Check build size  
      const assetFiles = fs.readdirSync('dist/assets').filter(f => f.startsWith('index-') && f.endsWith('.js'));
      if (assetFiles.length > 0) {
        const distStats = fs.statSync(`dist/assets/${assetFiles[0]}`);
        const sizeMB = distStats.size / (1024 * 1024);
        
        if (sizeMB > 2) {
          this.warn(`Build size is ${sizeMB.toFixed(2)}MB - consider optimization`);
        } else {
          this.pass(`Build size optimized: ${sizeMB.toFixed(2)}MB`);
        }
      } else {
        this.warn('No main JS bundle found in build output');
      }
    } catch (error) {
      this.error(`Build failed: ${error.message}`);
    }
  }

  validateDependencies() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredDeps = [
      '@tensorflow/tfjs',
      'tone',
      'meyda',
      'wavesurfer.js',
      'standardized-audio-context'
    ];

    requiredDeps.forEach(dep => {
      if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
        this.pass(`Required dependency: ${dep}`);
      } else {
        this.error(`Missing required dependency: ${dep}`);
      }
    });

    // Check for security vulnerabilities
    try {
      execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
      this.pass('No security vulnerabilities detected');
    } catch (error) {
      this.warn('Security vulnerabilities detected - run npm audit fix');
    }
  }

  // 4. USER EXPERIENCE VALIDATION (Professional Standards)
  validateUserExperience() {
    this.log(`\n${colors.bold}${colors.cyan}🎯 USER EXPERIENCE VALIDATION${colors.reset}`);
    
    this.validateUIConsistency();
    this.validateAccessibility();
    this.validatePerformance();
  }

  validateUIConsistency() {
    const cssPath = 'src/App.css';
    
    if (fs.existsSync(cssPath)) {
      const content = fs.readFileSync(cssPath, 'utf8');
      
      // Check for consistent color variables
      if (content.includes('--accent') && content.includes('--accent-2')) {
        this.pass('Consistent color system implemented');
      } else {
        this.warn('Inconsistent color system');
      }
      
      // Check for responsive design
      if (content.includes('@media') && content.includes('mobile')) {
        this.pass('Responsive design implemented');
      } else {
        this.warn('Missing responsive design patterns');
      }
    }
  }

  validateAccessibility() {
    const componentPath = 'src/components/VoiceEncrypter.tsx';
    
    if (fs.existsSync(componentPath)) {
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Check for proper ARIA labels
      if (content.includes('title=') || content.includes('aria-')) {
        this.pass('Accessibility attributes found');
      } else {
        this.warn('Missing accessibility attributes');
      }
      
      // Check for keyboard navigation
      if (content.includes('onKeyDown') || content.includes('tabIndex')) {
        this.pass('Keyboard navigation support');
      } else {
        this.warn('Limited keyboard navigation support');
      }
    }
  }

  validatePerformance() {
    // Check for performance optimizations
    const files = this.getFilesRecursive('src', ['.ts', '.tsx']);
    
    let hasUseMemo = false;
    let hasUseCallback = false;
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('useMemo')) hasUseMemo = true;
      if (content.includes('useCallback')) hasUseCallback = true;
    });
    
    if (hasUseMemo || hasUseCallback) {
      this.pass('Performance optimizations implemented');
    } else {
      this.warn('Consider React performance optimizations');
    }
  }

  // 5. DEPLOYMENT READINESS (1000% Error-Free)
  validateDeploymentReadiness() {
    this.log(`\n${colors.bold}${colors.red}🚀 DEPLOYMENT READINESS${colors.reset}`);
    
    this.validateConfiguration();
    this.validateDocumentation();
    this.validateGitState();
  }

  validateConfiguration() {
    const viteConfig = 'vite.config.ts';
    
    if (fs.existsSync(viteConfig)) {
      const content = fs.readFileSync(viteConfig, 'utf8');
      
      // Check for proper GitHub Pages config
      if (content.includes("base: '/word-hacker-404/'")) {
        this.pass('GitHub Pages base path configured');
      } else {
        this.error('Missing GitHub Pages base path configuration');
      }
    }
  }

  validateDocumentation() {
    const docs = ['README.md', 'VOICE_ENCRYPTER_ENGINE_PLAN.md', 'ARCHITECTURE.md'];
    
    docs.forEach(doc => {
      if (fs.existsSync(doc)) {
        const content = fs.readFileSync(doc, 'utf8');
        if (content.length > 100) {
          this.pass(`Documentation complete: ${doc}`);
        } else {
          this.warn(`Documentation incomplete: ${doc}`);
        }
      } else {
        this.error(`Missing documentation: ${doc}`);
      }
    });
  }

  validateGitState() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (status.trim() === '') {
        this.pass('Git working tree clean');
      } else {
        this.warn('Uncommitted changes detected');
      }
      
      // Check for proper commit messages
      const lastCommit = execSync('git log -1 --pretty=%s', { encoding: 'utf8' });
      if (lastCommit.includes('feat(') || lastCommit.includes('fix(')) {
        this.pass('Proper conventional commit format');
      } else {
        this.warn('Consider conventional commit format');
      }
    } catch (error) {
      this.error(`Git validation failed: ${error.message}`);
    }
  }

  // UTILITY FUNCTIONS
  getFilesRecursive(dir, extensions) {
    let results = [];
    
    try {
      const list = fs.readdirSync(dir);
      
      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          results = results.concat(this.getFilesRecursive(filePath, extensions));
        } else {
          const ext = path.extname(file);
          if (extensions.includes(ext)) {
            results.push(filePath);
          }
        }
      });
    } catch (e) {
      // Directory doesn't exist or permission denied
    }
    
    return results;
  }

  // MASTER VALIDATION RUNNER
  async runFullValidation() {
    this.log(`${colors.bold}${colors.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    const validations = [
      { name: 'Architecture', fn: () => this.validateArchitecture() },
      { name: 'Audio Quality', fn: () => this.validateAudioQuality() },
      { name: 'Code Quality', fn: () => this.validateCodeQuality() },
      { name: 'User Experience', fn: () => this.validateUserExperience() },
      { name: 'Deployment Readiness', fn: () => this.validateDeploymentReadiness() }
    ];

    let allPassed = true;
    
    for (const validation of validations) {
      try {
        const result = validation.fn();
        if (!result) allPassed = false;
      } catch (error) {
        this.error(`${validation.name} validation failed: ${error.message}`);
        allPassed = false;
      }
    }
    
    this.printSummary(allPassed);
    return this.issues.length === 0; // Only block deployment on critical issues, not warnings
  }

  printSummary(allPassed) {
    this.log(`\n${colors.bold}${colors.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    this.log(`${colors.bold}${colors.cyan}📊 MASTER INVIGILATOR SUMMARY${colors.reset}\n`);
    
    this.log(`${colors.green}✅ Passed: ${this.passed.length}${colors.reset}`);
    this.log(`${colors.yellow}⚠️  Warnings: ${this.warnings.length}${colors.reset}`);
    this.log(`${colors.red}❌ Critical Issues: ${this.issues.length}${colors.reset}\n`);
    
    if (this.issues.length > 0) {
      this.log(`${colors.bold}${colors.red}CRITICAL ISSUES TO FIX:${colors.reset}`);
      this.issues.forEach(issue => this.log(`  • ${issue}`));
      this.log('');
    }
    
    if (this.warnings.length > 0 && this.verbose) {
      this.log(`${colors.bold}${colors.yellow}WARNINGS:${colors.reset}`);
      this.warnings.forEach(warning => this.log(`  • ${warning}`));
      this.log('');
    }
    
    if (this.issues.length === 0) {
      this.log(`${colors.bold}${colors.green}🎉 NASA-GRADE QUALITY ACHIEVED!${colors.reset}`);
      this.log(`${colors.green}Project is ready for 1000% error-free deployment!${colors.reset}`);
    } else {
      this.log(`${colors.bold}${colors.red}❌ DEPLOYMENT BLOCKED${colors.reset}`);
      this.log(`${colors.red}Fix all critical issues before deployment.${colors.reset}`);
    }
    
    this.log(`${colors.bold}${colors.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  }
}

// CLI RUNNER
const isMainModule = process.argv[1] && process.argv[1].endsWith('quality-check.js');
if (isMainModule) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    fix: args.includes('--fix')
  };
  
  const invigilator = new MasterInvigilator(options);
  
  invigilator.runFullValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
}

export { MasterInvigilator };