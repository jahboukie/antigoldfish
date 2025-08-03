/**
 * MemoryEngine 2.0 Demo
 * Showcase the enhanced capabilities and performance improvements
 */

import { MemoryEngine2 } from '../MemoryEngine2';

async function demonstrateMemoryEngine2() {
    console.log('🚀 MemoryEngine 2.0 Demo Starting...\n');

    // Initialize with enhanced options
    const engine = new MemoryEngine2(process.cwd(), {
        enableVectorSearch: true,
        enableCaching: true,
        cacheSize: 500,
        connectionPoolSize: 3,
        embeddingDimensions: 384,
        performanceMonitoring: true,
        devMode: true
    });

    try {
        // Initialize the engine
        console.log('📚 Initializing MemoryEngine 2.0...');
        await engine.initialize();

        // Demo 1: Store various types of memories
        console.log('\n📝 Demo 1: Storing Enhanced Memories');
        await storeTestMemories(engine);

        // Demo 2: Hybrid search capabilities
        console.log('\n🔍 Demo 2: Hybrid Search (FTS + Semantic)');
        await demonstrateHybridSearch(engine);

        // Demo 3: Semantic similarity search
        console.log('\n🧠 Demo 3: Semantic Similarity Search');
        await demonstrateSemanticSearch(engine);

        // Demo 4: Performance metrics
        console.log('\n📊 Demo 4: Performance Metrics & Analytics');
        await demonstrateMetrics(engine);

        // Demo 5: Advanced features
        console.log('\n⚡ Demo 5: Advanced Features');
        await demonstrateAdvancedFeatures(engine);

        console.log('\n✅ Demo completed successfully!');

    } catch (error) {
        console.error('❌ Demo failed:', error);
    } finally {
        await engine.close();
    }
}

async function storeTestMemories(engine: MemoryEngine2) {
    const testMemories = [
        {
            content: 'Implemented user authentication system using JWT tokens and bcrypt password hashing',
            context: 'development',
            type: 'implementation',
            tags: ['authentication', 'security', 'jwt', 'bcrypt'],
            metadata: { project: 'user-system', complexity: 'medium' }
        },
        {
            content: 'Database schema design for e-commerce product catalog with categories and inventory tracking',
            context: 'architecture',
            type: 'design',
            tags: ['database', 'schema', 'ecommerce', 'products'],
            metadata: { project: 'shop-app', complexity: 'high' }
        },
        {
            content: 'Fixed memory leak in React component by properly cleaning up event listeners in useEffect',
            context: 'debugging',
            type: 'bugfix',
            tags: ['react', 'memory-leak', 'useeffect', 'cleanup'],
            metadata: { severity: 'high', timeToFix: '2 hours' }
        },
        {
            content: 'API endpoint for user profile management with validation and error handling',
            context: 'development',
            type: 'api',
            tags: ['api', 'validation', 'profile', 'endpoints'],
            metadata: { method: 'POST', route: '/api/profile' }
        },
        {
            content: 'Performance optimization: reduced database query time by 80% using proper indexing',
            context: 'optimization',
            type: 'performance',
            tags: ['database', 'indexing', 'performance', 'optimization'],
            metadata: { improvement: '80%', before: '500ms', after: '100ms' }
        }
    ];

    for (const memory of testMemories) {
        const id = await engine.storeMemory(
            memory.content,
            memory.context,
            memory.type,
            {
                tags: memory.tags,
                metadata: memory.metadata,
                generateEmbedding: true
            }
        );
        console.log(`  ✅ Stored: ${memory.type} (ID: ${id})`);
    }
}

async function demonstrateHybridSearch(engine: MemoryEngine2) {
    const searchQueries = [
        'authentication security',
        'database performance',
        'React memory issues',
        'API endpoints'
    ];

    for (const query of searchQueries) {
        console.log(`\n  🔍 Searching: "${query}"`);
        
        const result = await engine.searchMemories(query, {
            strategy: 'balanced',
            limit: 3,
            explain: true
        });

        console.log(`     Results: ${result.results.length}`);
        result.results.forEach((r, i) => {
            console.log(`     ${i + 1}. [${r.type}] ${r.content.substring(0, 60)}...`);
            console.log(`        📊 Relevance: ${(r.relevance * 100).toFixed(1)}% | Keyword: ${((r.keywordScore || 0) * 100).toFixed(1)}% | Semantic: ${((r.semanticScore || 0) * 100).toFixed(1)}%`);
        });

        if (result.metrics) {
            console.log(`     ⚡ Search Time: ${result.metrics.searchTime}ms | Strategy: ${result.metrics.strategy}`);
        }
    }
}

async function demonstrateSemanticSearch(engine: MemoryEngine2) {
    const semanticQueries = [
        'user login system',
        'data storage structure',
        'fixing bugs in frontend',
        'REST API development'
    ];

    for (const query of semanticQueries) {
        console.log(`\n  🧠 Semantic search: "${query}"`);
        
        const results = await engine.findSimilar(query, 3, 0.2);
        
        console.log(`     Similar memories: ${results.length}`);
        results.forEach((r, i) => {
            console.log(`     ${i + 1}. [${r.type}] ${r.content.substring(0, 60)}...`);
            console.log(`        🎯 Similarity: ${((r.semanticScore || 0) * 100).toFixed(1)}%`);
        });
    }
}

async function demonstrateMetrics(engine: MemoryEngine2) {
    const stats = await engine.getStats();
    
    console.log('  📊 Performance Metrics:');
    console.log(`     Total Queries: ${stats.performance.totalQueries}`);
    console.log(`     Avg Query Time: ${stats.performance.avgQueryTime.toFixed(1)}ms`);
    console.log(`     Cache Hit Rate: ${(stats.performance.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`     Connection Pool Efficiency: ${(stats.performance.connectionPoolEfficiency * 100).toFixed(1)}%`);
    
    console.log('\n  💾 Memory Usage:');
    console.log(`     Total Memories: ${stats.memory.totalMemories}`);
    console.log(`     Vector Index Size: ${stats.memory.vectorIndexSize.toFixed(1)}MB`);
    console.log(`     Cache Memory Usage: ${stats.memory.cacheMemoryUsage.toFixed(1)}MB`);
    console.log(`     Database Size: ${stats.memory.databaseSize.toFixed(1)}MB`);
    
    console.log('\n  🔍 Search Statistics:');
    console.log(`     FTS Queries: ${stats.search.ftsQueries}`);
    console.log(`     Semantic Queries: ${stats.search.semanticQueries}`);
    console.log(`     Hybrid Queries: ${stats.search.hybridQueries}`);
    
    console.log('\n  ⚙️  System Info:');
    console.log(`     Uptime: ${(stats.system.uptime / 1000).toFixed(1)}s`);
    console.log(`     Version: ${stats.system.version}`);
    console.log(`     Initialized: ${stats.system.initialized}`);
}

async function demonstrateAdvancedFeatures(engine: MemoryEngine2) {
    // Analytics
    console.log('  📈 Getting Analytics...');
    const analytics = await engine.getAnalytics();
    
    console.log('     Top Contexts:');
    analytics.topContexts.slice(0, 3).forEach(ctx => {
        console.log(`       ${ctx.context}: ${ctx.count} memories`);
    });
    
    console.log('     Top Types:');
    analytics.topTypes.slice(0, 3).forEach(type => {
        console.log(`       ${type.type}: ${type.count} memories`);
    });
    
    if (analytics.recommendations.length > 0) {
        console.log('     💡 Recommendations:');
        analytics.recommendations.forEach(rec => {
            console.log(`       • ${rec}`);
        });
    }
    
    // Optimization
    console.log('\n  🔧 Running Optimization...');
    await engine.optimize();
}

// Run the demo
if (require.main === module) {
    demonstrateMemoryEngine2().catch(console.error);
}

export { demonstrateMemoryEngine2 };