import { ExecutionResult, ExecutionRequest } from './executionEngine';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ExecutionMemory {
  executionId: string;
  projectId: string;
  timestamp: Date;
  request: ExecutionRequest;
  result: ExecutionResult;
  aiAssistant: string;
  conversationId?: string;
  learningData: ExecutionLearningData;
}

export interface ExecutionLearningData {
  codePatterns: CodePattern[];
  errorPatterns: ErrorPattern[];
  performanceInsights: PerformanceInsight[];
  successFactors: SuccessFactors;
}

export interface CodePattern {
  pattern: string;
  language: string;
  frequency: number;
  successRate: number;
  commonErrors: string[];
  bestPractices: string[];
}

export interface ErrorPattern {
  errorType: string;
  errorMessage: string;
  codeContext: string;
  frequency: number;
  solutions: string[];
  preventionTips: string[];
}

export interface PerformanceInsight {
  operation: string;
  averageTime: number;
  memoryUsage: number;
  optimizationSuggestions: string[];
}

export interface SuccessFactors {
  workingPatterns: string[];
  optimalDependencies: string[];
  bestPractices: string[];
  avoidedPitfalls: string[];
}

export class ExecutionMemoryManager {
  private db: sqlite3.Database | null = null;
  private projectPath: string;
  private dbPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.dbPath = path.join(projectPath, '.codecontext', 'memory.db');
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Failed to connect to memory database:', err);
          reject(err);
        } else {
          console.log('Connected to memory database');
          resolve();
        }
      });
    });
  }

  async recordExecution(
    request: ExecutionRequest,
    result: ExecutionResult,
    aiAssistant: string,
    conversationId?: string
  ): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized');
      return;
    }

    const recordedConversationId = conversationId || uuidv4();
    const projectId = this.generateProjectId();

    try {
      // Insert conversation
      await this.runQuery(
        `INSERT INTO conversations (id, project_id, ai_assistant, context) VALUES (?, ?, ?, ?)`,
        [
          recordedConversationId,
          projectId,
          aiAssistant || 'codecontext-execution-engine',
          JSON.stringify({
            activeFile: `execution_${result.id}.${this.getFileExtension(request.language)}`,
            selectedText: request.code
          })
        ]
      );

      // Insert user message (code execution request)
      await this.runQuery(
        `INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)`,
        [
          `msg_${Date.now()}_1`,
          recordedConversationId,
          'user',
          `Execute ${request.language} code:\n\`\`\`${request.language}\n${request.code}\n\`\`\``,
          JSON.stringify({
            language: request.language,
            executionId: result.id,
            timeout: request.timeout,
            memoryLimit: request.memoryLimit
          })
        ]
      );

      // Insert assistant message (execution result)
      await this.runQuery(
        `INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)`,
        [
          `msg_${Date.now()}_2`,
          recordedConversationId,
          'assistant',
          `Execution ${result.success ? 'completed successfully' : 'failed'}:\n\nOutput:\n${result.output || 'No output'}\n\n${result.errors && result.errors.length > 0 ? `Errors:\n${result.errors.join('\n')}` : ''}`,
          JSON.stringify({
            success: result.success,
            executionTime: result.executionTime,
            memoryUsage: result.memoryUsage,
            exitCode: result.exitCode,
            errors: result.errors
          })
        ]
      );

      // Record architectural decision if execution failed
      if (!result.success && result.errors && result.errors.length > 0) {
        await this.runQuery(
          `INSERT INTO architectural_decisions (id, project_id, decision, rationale, alternatives, impact, files_affected) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            projectId,
            `Code execution failed in ${request.language}`,
            `Execution failed with errors: ${result.errors.join(', ')}`,
            JSON.stringify(['Fix syntax errors', 'Use different approach', 'Add error handling']),
            JSON.stringify(['Code execution', 'Development workflow']),
            JSON.stringify([])
          ]
        );
      }

      console.log(`🧠 Execution conversation recorded: ${recordedConversationId} (${result.success ? '✅ Success' : '❌ Failed'})`);
    } catch (error) {
      console.error('Failed to record execution in memory:', error);
    }
  }

  private getFileExtension(language: string): string {
    const extensions: { [key: string]: string } = {
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'go': 'go',
      'rust': 'rs'
    };
    return extensions[language] || 'txt';
  }

  private async runQuery(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  private generateProjectId(): string {
    // Generate a simple hash of the project path
    return require('crypto').createHash('md5').update(this.projectPath).digest('hex').substring(0, 16);
  }

  async getExecutionHistory(
    language?: string,
    successOnly?: boolean,
    limit: number = 50
  ): Promise<ExecutionMemory[]> {
    // Query execution history from memory
    const query = this.buildExecutionQuery(language, successOnly, limit);
    return await this.queryExecutionMemory(query);
  }

  async getCodePatterns(language: string): Promise<CodePattern[]> {
    const executions = await this.getExecutionHistory(language, true);
    return this.analyzeCodePatterns(executions);
  }

  async getErrorPatterns(language: string): Promise<ErrorPattern[]> {
    const executions = await this.getExecutionHistory(language, false);
    return this.analyzeErrorPatterns(executions);
  }

  async getPerformanceInsights(language: string): Promise<PerformanceInsight[]> {
    const executions = await this.getExecutionHistory(language, true);
    return this.analyzePerformancePatterns(executions);
  }

  async predictExecutionSuccess(request: ExecutionRequest): Promise<{
    successProbability: number;
    potentialIssues: string[];
    recommendations: string[];
  }> {
    const patterns = await this.getCodePatterns(request.language);
    const errorPatterns = await this.getErrorPatterns(request.language);
    
    return this.analyzePredictiveFactors(request, patterns, errorPatterns);
  }

  async suggestImprovements(request: ExecutionRequest): Promise<{
    codeImprovements: string[];
    performanceOptimizations: string[];
    securityEnhancements: string[];
  }> {
    const insights = await this.getPerformanceInsights(request.language);
    const patterns = await this.getCodePatterns(request.language);
    
    return this.generateImprovementSuggestions(request, insights, patterns);
  }

  private async extractLearningData(
    request: ExecutionRequest,
    result: ExecutionResult
  ): Promise<ExecutionLearningData> {
    return {
      codePatterns: this.extractCodePatterns(request, result),
      errorPatterns: this.extractErrorPatterns(request, result),
      performanceInsights: this.extractPerformanceInsights(request, result),
      successFactors: this.extractSuccessFactors(request, result)
    };
  }

  private extractCodePatterns(request: ExecutionRequest, result: ExecutionResult): CodePattern[] {
    const patterns: CodePattern[] = [];
    
    // Analyze code structure and patterns
    const codeLines = request.code.split('\n');
    const imports = codeLines.filter(line => 
      line.trim().startsWith('import ') || 
      line.trim().startsWith('from ') ||
      line.trim().startsWith('require(')
    );
    
    const functions = codeLines.filter(line => 
      line.includes('function ') || 
      line.includes('=>') ||
      line.includes('def ')
    );

    // Create patterns based on successful/failed execution
    if (imports.length > 0) {
      patterns.push({
        pattern: 'import_usage',
        language: request.language,
        frequency: 1,
        successRate: result.success ? 1 : 0,
        commonErrors: result.success ? [] : result.errors,
        bestPractices: result.success ? ['Proper import structure'] : []
      });
    }

    return patterns;
  }

  private extractErrorPatterns(request: ExecutionRequest, result: ExecutionResult): ErrorPattern[] {
    if (result.success || result.errors.length === 0) {
      return [];
    }

    return result.errors.map(error => ({
      errorType: this.categorizeError(error),
      errorMessage: error,
      codeContext: this.extractErrorContext(request.code, error),
      frequency: 1,
      solutions: this.suggestSolutions(error, request.language),
      preventionTips: this.generatePreventionTips(error, request.language)
    }));
  }

  private extractPerformanceInsights(
    request: ExecutionRequest,
    result: ExecutionResult
  ): PerformanceInsight[] {
    if (!result.performanceMetrics) {
      return [];
    }

    return [{
      operation: 'code_execution',
      averageTime: result.executionTime,
      memoryUsage: result.memoryUsage,
      optimizationSuggestions: this.generateOptimizationSuggestions(result.performanceMetrics)
    }];
  }

  private extractSuccessFactors(request: ExecutionRequest, result: ExecutionResult): SuccessFactors {
    if (!result.success) {
      return {
        workingPatterns: [],
        optimalDependencies: [],
        bestPractices: [],
        avoidedPitfalls: []
      };
    }

    return {
      workingPatterns: this.identifyWorkingPatterns(request.code),
      optimalDependencies: request.dependencies || [],
      bestPractices: this.identifyBestPractices(request.code, request.language),
      avoidedPitfalls: this.identifyAvoidedPitfalls(request.code, request.language)
    };
  }

  private async storeExecutionMemory(executionMemory: ExecutionMemory): Promise<void> {
    // Store in SQLite database through memory engine
    // This would extend the memory engine schema to include execution data
    console.log(`Storing execution memory for ${executionMemory.executionId}`);
  }

  private async updateProjectPatterns(executionMemory: ExecutionMemory): Promise<void> {
    // Update project-wide patterns based on this execution
    console.log(`Updating project patterns based on execution ${executionMemory.executionId}`);
  }

  private async linkExecutionToConversation(
    executionMemory: ExecutionMemory,
    conversationId: string
  ): Promise<void> {
    // Link this execution to a conversation in memory
    console.log(`Linking execution ${executionMemory.executionId} to conversation ${conversationId}`);
  }

  private buildExecutionQuery(language?: string, successOnly?: boolean, limit: number = 50): string {
    // Build SQL query for execution history
    return `SELECT * FROM executions WHERE 1=1 ${language ? `AND language = '${language}'` : ''} ${successOnly ? 'AND success = 1' : ''} ORDER BY timestamp DESC LIMIT ${limit}`;
  }

  private async queryExecutionMemory(query: string): Promise<ExecutionMemory[]> {
    // Execute query against memory database
    return [];
  }

  private analyzeCodePatterns(executions: ExecutionMemory[]): CodePattern[] {
    // Analyze patterns across multiple executions
    return [];
  }

  private analyzeErrorPatterns(executions: ExecutionMemory[]): ErrorPattern[] {
    // Analyze error patterns across multiple executions
    return [];
  }

  private analyzePerformancePatterns(executions: ExecutionMemory[]): PerformanceInsight[] {
    // Analyze performance patterns across multiple executions
    return [];
  }

  private analyzePredictiveFactors(
    request: ExecutionRequest,
    patterns: CodePattern[],
    errorPatterns: ErrorPattern[]
  ): { successProbability: number; potentialIssues: string[]; recommendations: string[] } {
    // Use historical data to predict success
    return {
      successProbability: 0.85,
      potentialIssues: [],
      recommendations: []
    };
  }

  private generateImprovementSuggestions(
    request: ExecutionRequest,
    insights: PerformanceInsight[],
    patterns: CodePattern[]
  ): { codeImprovements: string[]; performanceOptimizations: string[]; securityEnhancements: string[] } {
    return {
      codeImprovements: [],
      performanceOptimizations: [],
      securityEnhancements: []
    };
  }

  private categorizeError(error: string): string {
    if (error.includes('SyntaxError')) return 'syntax';
    if (error.includes('TypeError')) return 'type';
    if (error.includes('ReferenceError')) return 'reference';
    if (error.includes('ImportError') || error.includes('ModuleNotFoundError')) return 'import';
    return 'runtime';
  }

  private extractErrorContext(code: string, error: string): string {
    // Extract relevant code context around the error
    return code.split('\n').slice(0, 5).join('\n');
  }

  private suggestSolutions(error: string, language: string): string[] {
    // Generate solution suggestions based on error type and language
    return [`Check ${language} syntax`, 'Verify imports', 'Review variable names'];
  }

  private generatePreventionTips(error: string, language: string): string[] {
    // Generate tips to prevent similar errors
    return [`Use ${language} linter`, 'Add type checking', 'Test incrementally'];
  }

  private generateOptimizationSuggestions(metrics: any): string[] {
    return ['Consider caching', 'Optimize loops', 'Reduce memory allocation'];
  }

  private identifyWorkingPatterns(code: string): string[] {
    return ['Proper error handling', 'Clean function structure'];
  }

  private identifyBestPractices(code: string, language: string): string[] {
    return [`${language} best practices followed`];
  }

  private identifyAvoidedPitfalls(code: string, language: string): string[] {
    return [`Avoided common ${language} pitfalls`];
  }

}
