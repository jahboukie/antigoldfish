#!/usr/bin/env node

/**
 * Quick test of MemoryEngine 2.0 capabilities
 * Run with: node test-memory-engine-2.js
 */

const { MemoryEngine2 } = require('./dist/MemoryEngine2');

async function testMemoryEngine2() {
    console.log('🚀 Testing MemoryEngine 2.0...\n');

    const engine = new MemoryEngine2(process.cwd(), {
        enableVectorSearch: true,
        enableCaching: true,
        devMode: true,
        performanceMonitoring: true
    });

    try {
        // Initialize
        console.log('📚 Initializing...');
        await engine.initialize();

        // Store test memory
        console.log('💾 Storing test memory...');
        // Use timestamp in content to avoid UNIQUE(content_hash) conflicts across repeated runs.
        const uniqueContent = 'Fixed authentication bug in user login system by updating JWT token validation #' + Date.now();
        await engine.storeMemory(
            uniqueContent,
            'debugging',
            'bugfix',
            {
                tags: ['auth', 'jwt', 'bug'],
                metadata: { severity: 'high' }
            }
        );

        // Test search
        console.log('🔍 Testing search...');
    const results = await engine.searchMemories('authentication system', {
            strategy: 'balanced',
            limit: 5
        });

        console.log(`Found ${results.results.length} results:`);
        results.results.forEach((r, i) => {
            console.log(`  ${i + 1}. [${r.type}] ${r.content.substring(0, 80)}...`);
        });

        // Get stats
        console.log('\n📊 Getting performance stats...');
        const stats = await engine.getStats();
        console.log(`Total memories: ${stats.memory.totalMemories}`);
        console.log(`Cache hit rate: ${(stats.performance.cacheHitRate * 100).toFixed(1)}%`);
        console.log(`Avg query time: ${stats.performance.avgQueryTime.toFixed(1)}ms`);

        console.log('\n✅ MemoryEngine 2.0 test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        await engine.close();
    }
}

if (require.main === module) {
    testMemoryEngine2().catch(console.error);
}