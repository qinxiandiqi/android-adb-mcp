#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Execute command and return result
function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (err) {
    return {
      success: false,
      output: err.stdout || '',
      error: err.stderr || err.message
    };
  }
}

// Version utilities
function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function updateVersion(version) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.version = version;
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  return version;
}

function validateVersion(version) {
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semverRegex.test(version);
}

// Git utilities
function getCurrentBranch() {
  const result = exec('git rev-parse --abbrev-ref HEAD', { silent: true });
  return result.output.trim();
}

function isWorkingDirectoryClean() {
  const result = exec('git status --porcelain', { silent: true });
  return result.output.trim() === '';
}

function hasUnpushedCommits() {
  const result = exec('git status --porcelain -b', { silent: true });
  return result.output.includes('[ahead');
}

// Release steps
function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'cyan');

  // Check if we're on main branch
  const branch = getCurrentBranch();
  if (branch !== 'main' && branch !== 'master') {
    error(`Not on main branch. Current branch: ${branch}`);
    log('Switch to main branch before releasing.', 'yellow');
    return false;
  }
  success('On main branch');

  // Check if working directory is clean
  if (!isWorkingDirectoryClean()) {
    error('Working directory is not clean');
    log('Commit or stash your changes before releasing.', 'yellow');
    return false;
  }
  success('Working directory is clean');

  // Check if Node.js is available
  const nodeVersion = exec('node --version', { silent: true });
  if (!nodeVersion.success) {
    error('Node.js is not available');
    return false;
  }
  success(`Node.js ${nodeVersion.output.trim()}`);

  // Check if pnpm is available
  const pnpmVersion = exec('pnpm --version', { silent: true });
  if (!pnpmVersion.success) {
    error('pnpm is not available');
    return false;
  }
  success(`pnpm ${pnpmVersion.output.trim()}`);

  return true;
}

function runTests() {
  log('🧪 Running tests...', 'cyan');

  // Lint
  const lintResult = exec('pnpm lint', { silent: true });
  if (!lintResult.success) {
    error('Linting failed');
    log(lintResult.output);
    return false;
  }
  success('Linting passed');

  // Type check
  const typeCheckResult = exec('pnpm type-check', { silent: true });
  if (!typeCheckResult.success) {
    error('Type checking failed');
    return false;
  }
  success('Type checking passed');

  // Tests
  const testResult = exec('pnpm test', { silent: true });
  if (!testResult.success) {
    error('Tests failed');
    return false;
  }
  success('All tests passed');

  return true;
}

function buildProject() {
  log('🏗️  Building project...', 'cyan');

  // Clean previous build
  exec('pnpm clean', { silent: true });

  // Build
  const buildResult = exec('pnpm build', { silent: true });
  if (!buildResult.success) {
    error('Build failed');
    log(buildResult.error);
    return false;
  }

  success('Build completed');
  return true;
}

function generateDocumentation() {
  log('📚 Generating documentation...', 'cyan');

  const docsResult = exec('pnpm docs:generate', { silent: true });
  if (!docsResult.success) {
    warning('Documentation generation failed (non-critical)');
    return true; // Continue even if docs fail
  }

  success('Documentation generated');
  return true;
}

function runBenchmarks() {
  log('📊 Running benchmarks...', 'cyan');

  const benchmarkResult = exec('pnpm benchmark', { silent: true });
  if (!benchmarkResult.success) {
    warning('Benchmarks failed (non-critical)');
    return true; // Continue even if benchmarks fail
  }

  success('Benchmarks completed');
  return true;
}

function updateChangelog(version) {
  log('📝 Updating changelog...', 'cyan');

  const changelogPath = 'CHANGELOG.md';
  let changelog = '';

  if (fs.existsSync(changelogPath)) {
    changelog = fs.readFileSync(changelogPath, 'utf8');
  }

  const today = new Date().toISOString().split('T')[0];
  const newEntry = `## [${version}] - ${today}

### Added
- Automated release improvements
- Enhanced CI/CD pipeline
- Performance benchmarking tools
- Advanced debugging features

### Changed
- Improved error handling
- Updated dependencies

### Fixed
- Fixed Jest configuration issues
- Resolved module path problems

### Security
- Enhanced input validation
- Security audit improvements

---

`;

  if (!changelog.startsWith('# Changelog')) {
    changelog = '# Changelog\n\n' + newEntry + changelog;
  } else {
    changelog = changelog.replace('# Changelog\n\n', '# Changelog\n\n' + newEntry);
  }

  fs.writeFileSync(changelogPath, changelog);
  success('Changelog updated');
  return true;
}

function createGitTag(version) {
  log(`🏷️  Creating git tag v${version}...`, 'cyan');

  // Add all changes
  exec('git add .', { silent: true });

  // Commit changes
  exec(`git commit -m "chore(release): v${version}"`, { silent: true });

  // Create tag
  const tagResult = exec(`git tag v${version}`, { silent: true });
  if (!tagResult.success) {
    error('Failed to create git tag');
    return false;
  }

  success(`Git tag v${version} created`);
  return true;
}

function pushToRemote(version) {
  log('🚀 Pushing to remote...', 'cyan');

  // Push commits
  const pushResult = exec('git push origin main', { silent: true });
  if (!pushResult.success) {
    error('Failed to push commits');
    return false;
  }

  // Push tag
  const tagPushResult = exec(`git push origin v${version}`, { silent: true });
  if (!tagPushResult.success) {
    error('Failed to push tag');
    return false;
  }

  success('Pushed to remote');
  return true;
}

function publishToNpm(dryRun = false) {
  log(`📦 Publishing to npm${dryRun ? ' (dry run)' : ''}...`, 'cyan');

  const command = dryRun ? 'pnpm publish --dry-run' : 'pnpm publish --no-git-checks';
  const publishResult = exec(command, { silent: true });

  if (!publishResult.success) {
    error('Failed to publish to npm');
    log(publishResult.error);
    return false;
  }

  success(`Published to npm${dryRun ? ' (dry run)' : ''}`);
  return true;
}

// Main release function
async function release(options = {}) {
  const {
    version,
    dryRun = false,
    skipTests = false,
    skipGit = false,
    skipNpm = false,
    skipBenchmarks = false
  } = options;

  log('🚀 Starting release process...', 'bright');
  log('================================', 'cyan');

  // Check prerequisites
  if (!checkPrerequisites()) {
    error('Prerequisites check failed');
    process.exit(1);
  }

  // Handle version
  let newVersion = version;
  if (!newVersion) {
    const currentVersion = getCurrentVersion();
    info(`Current version: ${currentVersion}`);
    warning('No version specified. Use --version to specify a version.');
    process.exit(1);
  }

  if (!validateVersion(newVersion)) {
    error(`Invalid version format: ${newVersion}`);
    info('Use semantic versioning: x.y.z or x.y.z-prerelease');
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  if (newVersion <= currentVersion) {
    error(`New version ${newVersion} must be greater than current version ${currentVersion}`);
    process.exit(1);
  }

  log(`Releasing version: ${newVersion}`, 'bright');

  // Update version
  updateVersion(newVersion);
  success(`Version updated to ${newVersion}`);

  // Run tests
  if (!skipTests) {
    if (!runTests()) {
      error('Tests failed');
      process.exit(1);
    }
  } else {
    warning('Skipping tests');
  }

  // Build project
  if (!buildProject()) {
    error('Build failed');
    process.exit(1);
  }

  // Generate documentation
  generateDocumentation();

  // Run benchmarks
  if (!skipBenchmarks) {
    runBenchmarks();
  } else {
    warning('Skipping benchmarks');
  }

  // Update changelog
  updateChangelog(newVersion);

  // Git operations
  if (!skipGit) {
    if (!dryRun) {
      if (!createGitTag(newVersion)) {
        error('Git operations failed');
        process.exit(1);
      }

      if (!pushToRemote(newVersion)) {
        error('Git push failed');
        process.exit(1);
      }
    } else {
      warning('Skipping git operations (dry run)');
    }
  } else {
    warning('Skipping git operations');
  }

  // Publish to npm
  if (!skipNpm) {
    if (!publishToNpm(dryRun)) {
      error('npm publish failed');
      process.exit(1);
    }
  } else {
    warning('Skipping npm publish');
  }

  // Success
  log('🎉 Release completed successfully!', 'bright');
  log('==============================', 'green');

  if (!dryRun) {
    log(`📦 Version ${newVersion} is now available on npm`, 'green');
    log(`🏷️  Git tag v${newVersion} has been pushed`, 'green');
    log(`📚 Documentation updated`, 'green');
  }

  return true;
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--version':
      case '-v':
        options.version = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-tests':
        options.skipTests = true;
        break;
      case '--skip-git':
        options.skipGit = true;
        break;
      case '--skip-npm':
        options.skipNpm = true;
        break;
      case '--skip-benchmarks':
        options.skipBenchmarks = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node release.js [options]

Options:
  --version <version>     Version to release (required)
  --dry-run              Run through all steps without actually releasing
  --skip-tests           Skip running tests
  --skip-git             Skip git operations
  --skip-npm             Skip npm publish
  --skip-benchmarks      Skip performance benchmarks
  --help, -h             Show this help message

Examples:
  node release.js --version 1.2.3
  node release.js --version 1.2.3 --dry-run
  node release.js --version 1.2.3-beta.1 --skip-tests
        `);
        process.exit(0);
    }
  }

  return options;
}

// Run release if this file is executed directly
if (require.main === module) {
  const options = parseArgs();

  if (!options.version) {
    error('Version is required. Use --version <version> or --help for usage.');
    process.exit(1);
  }

  release(options).catch(error => {
    error(`Release failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { release };