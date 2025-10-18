#!/usr/bin/env node

/**
 * DEPLOYMENT GATE KEEPER
 * 
 * Final validation before deployment - acts as ultimate safeguard
 * Only allows deployment if ALL quality checks pass
 * 
 * Usage: node deploy-gate.js [--force]
 */

import { MasterInvigilator } from './quality-check.js';
import { execSync } from 'child_process';
import fs from 'fs';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class DeploymentGateKeeper {
  constructor(options = {}) {
    this.force = options.force || false;
    
    console.log(`${colors.bold}${colors.red}🛡️  DEPLOYMENT GATE KEEPER${colors.reset}`);
    console.log(`${colors.blue}Final validation before deployment to production${colors.reset}\n`);
  }

  async validateForDeployment() {
    // Run full quality validation
    const invigilator = new MasterInvigilator({ verbose: false });
    const qualityPassed = await invigilator.runFullValidation();
    
    if (!qualityPassed && !this.force) {
      console.log(`${colors.bold}${colors.red}🚫 DEPLOYMENT BLOCKED${colors.reset}`);
      console.log(`${colors.red}Quality validation failed. Fix issues before deploying.${colors.reset}`);
      console.log(`${colors.yellow}Use --force to override (NOT RECOMMENDED)${colors.reset}\n`);
      return false;
    }
    
    // Additional deployment-specific checks
    this.validateDeploymentEnvironment();
    
    if (qualityPassed) {
      console.log(`${colors.bold}${colors.green}✅ DEPLOYMENT APPROVED${colors.reset}`);
      console.log(`${colors.green}All quality gates passed - safe to deploy!${colors.reset}\n`);
      
      // Optionally trigger deployment
      if (process.env.AUTO_DEPLOY === 'true') {
        this.triggerDeployment();
      }
      
      return true;
    }
    
    return false;
  }

  validateDeploymentEnvironment() {
    console.log(`${colors.bold}${colors.cyan}🔍 DEPLOYMENT ENVIRONMENT VALIDATION${colors.reset}`);
    
    // Check git branch
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      if (branch === 'main') {
        console.log(`${colors.green}✅ On main branch${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  Not on main branch (${branch})${colors.reset}`);
      }
    } catch (e) {
      console.log(`${colors.red}❌ Git validation failed${colors.reset}`);
    }
    
    // Check for clean working tree
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim() === '') {
        console.log(`${colors.green}✅ Clean working tree${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  Uncommitted changes detected${colors.reset}`);
      }
    } catch (e) {
      console.log(`${colors.red}❌ Working tree check failed${colors.reset}`);
    }
    
    // Validate build artifacts
    if (fs.existsSync('dist/index.html')) {
      console.log(`${colors.green}✅ Build artifacts present${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Missing build artifacts - run npm run build${colors.reset}`);
    }
  }

  triggerDeployment() {
    console.log(`${colors.bold}${colors.green}🚀 TRIGGERING DEPLOYMENT${colors.reset}`);
    
    try {
      // This would trigger your actual deployment process
      // For GitHub Pages, it's handled by GitHub Actions
      execSync('git push origin main', { stdio: 'inherit' });
      
      console.log(`${colors.green}✅ Deployment triggered successfully${colors.reset}`);
      console.log(`${colors.cyan}Check GitHub Actions for deployment status${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Deployment failed: ${error.message}${colors.reset}`);
    }
  }
}

// CLI RUNNER
const isMainModule = process.argv[1] && process.argv[1].endsWith('deploy-gate.js');
if (isMainModule) {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force')
  };
  
  const gateKeeper = new DeploymentGateKeeper(options);
  
  gateKeeper.validateForDeployment()
    .then(approved => {
      process.exit(approved ? 0 : 1);
    })
    .catch(error => {
      console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
}

export { DeploymentGateKeeper };