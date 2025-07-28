#!/usr/bin/env node

/**
 * CodeContextPro-MES CLI Entry Point
 * Launches the CLI application
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import { main } from './index';

// Set environment for CLI execution
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Run the CLI
main(process.argv);