#!/usr/bin/env node

/**
 * AntiGoldfishMode CLI Entry Point
 * Launches the CLI application
 */

// No environment variables needed for v1.0

import { main } from './index';

// Set environment for CLI execution
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Run the CLI
main(process.argv);
