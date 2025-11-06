# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Advanced batch command execution
- Real-time performance monitoring
- Wireless ADB connection management
- File streaming capabilities
- Enhanced CI/CD pipeline
- Performance benchmarking tools
- Automated release management
- Comprehensive API documentation generation

### Changed
- Improved Jest configuration and removed deprecation warnings
- Enhanced error handling and input validation
- Updated dependencies for better security and performance

### Fixed
- Fixed module path issues in test files
- Resolved TypeScript compilation warnings
- Fixed build configuration problems

### Security
- Enhanced input validation for all shell commands
- Improved security audit process
- Added automated security scanning in CI

---

## [1.0.0] - 2024-01-XX

### Added
- Initial release of ADB MCP Server
- Complete ADB functionality封装
- Model Context Protocol (MCP) support
- Device management tools
- Shell command execution with safety validation
- File operations (push/pull/list/create/delete)
- Application management (install/uninstall/start/stop)
- Media operations (screenshot/screen recording)
- Log access and filtering
- Comprehensive security validation
- Full TypeScript support
- Complete test suite with Jest
- ESLint configuration
- Detailed documentation

### Features
- **Device Tools** (6 tools)
  - List connected devices
  - Get device information
  - Connect/disconnect devices
  - Check device status
  - Wait for device connection

- **Shell Tools** (5 tools)
  - Safe shell command execution
  - System property access
  - Process monitoring
  - Memory information
  - Disk usage statistics

- **File Tools** (6 tools)
  - File and directory listing
  - File push/pull operations
  - Directory creation
  - File removal
  - File information access

- **App Tools** (7 tools)
  - Installed application listing
  - Application information retrieval
  - APK installation/uninstallation
  - Application start/stop
  - Application data clearing

- **Media Tools** (6 tools)
  - Screen capture
  - Screen recording
  - Screen information access
  - Screen density management

- **Log Tools** (6 tools)
  - Logcat access with filtering
  - Log buffer management
  - Crash log retrieval
  - ANR log access
  - Kernel log reading

### Security
- Comprehensive input validation using Zod
- Shell command safety whitelist
- Path traversal prevention
- Permission-based access control

### Development
- TypeScript strict mode
- Comprehensive unit tests
- Integration test framework
- ESLint code quality enforcement
- Automated CI/CD pipeline
- Performance benchmarking