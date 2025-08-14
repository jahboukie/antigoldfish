#!/usr/bin/env node

/**
 * SecuraMem CLI Entry Point
 * Launches the CLI application
 */

// No environment variables needed for v1.0

import { main } from './index';
import { Paths } from './utils/Paths';

// Set environment for CLI execution
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Run the CLI
try {
	const projectRoot = process.cwd();
	const migrated = Paths.migrateLegacyToCanonical(projectRoot);
	if (migrated && (process.env.SMEM_MIGRATION_SILENT !== '1')) {
		console.log('🔁 Migrated legacy .antigoldfishmode to .securamem (kept existing files intact).');
	}
} catch {}

main(process.argv);
