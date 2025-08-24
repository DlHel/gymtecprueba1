// Bitácora MCP Server - Provides @bitacora system integration for Claude CLI
// Automatically references project documentation and context

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs').promises;
const path = require('path');

class BitacoraMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'gymtec-bitacora',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.bitacoraPath = path.join(process.cwd(), 'docs', 'BITACORA_PROYECTO.md');
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'bitacora_reference',
            description: 'Reference @bitacora system for project context and patterns',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: '@bitacora command to execute',
                  enum: ['@bitacora', '@bitacora api', '@bitacora database', '@bitacora authentication', '@bitacora frontend', '@bitacora backend', '@bitacora debug', '@bitacora security', '@bitacora deployment']
                },
                context: {
                  type: 'string',
                  description: 'Additional context for the reference'
                }
              },
              required: ['command']
            }
          },
          {
            name: 'update_bitacora',
            description: 'Update bitácora with new learnings or solutions',
            inputSchema: {
              type: 'object',
              properties: {
                section: {
                  type: 'string',
                  description: 'Section to update'
                },
                content: {
                  type: 'string',
                  description: 'Content to add to bitácora'
                },
                type: {
                  type: 'string',
                  enum: ['solution', 'pattern', 'issue', 'improvement'],
                  description: 'Type of update'
                }
              },
              required: ['section', 'content', 'type']
            }
          },
          {
            name: 'search_bitacora',
            description: 'Search bitácora for specific patterns or solutions',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search term or pattern to find'
                }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'bitacora_reference':
            return await this.bitacoraReference(args.command, args.context);
          
          case 'update_bitacora':
            return await this.updateBitacora(args.section, args.content, args.type);
          
          case 'search_bitacora':
            return await this.searchBitacora(args.query);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  async bitacoraReference(command, context = '') {
    try {
      const content = await fs.readFile(this.bitacoraPath, 'utf-8');
      
      const commandMap = {
        '@bitacora': 'Complete project context',
        '@bitacora api': 'API endpoints and patterns',
        '@bitacora database': 'Schema and relationships',
        '@bitacora authentication': 'JWT auth system',
        '@bitacora frontend': 'Vanilla JS architecture',
        '@bitacora backend': 'Express + MySQL patterns',
        '@bitacora debug': 'Debug system and logging',
        '@bitacora security': 'Security measures',
        '@bitacora deployment': 'Deployment configuration'
      };

      const description = commandMap[command] || 'General project reference';
      
      if (command === '@bitacora') {
        return {
          content: [{
            type: 'text',
            text: `# ${description}\n\n${content}\n\n**Context**: ${context || 'Complete project overview requested'}\n\n**Auto-Reference**: This provides comprehensive project context for consistent development patterns.`
          }]
        };
      }

      // Extract specific section based on command
      const sectionKeywords = {
        '@bitacora api': ['API', 'endpoint', 'route', 'REST'],
        '@bitacora database': ['database', 'MySQL', 'schema', 'table'],
        '@bitacora authentication': ['auth', 'JWT', 'login', 'token'],
        '@bitacora frontend': ['frontend', 'JavaScript', 'HTML', 'CSS'],
        '@bitacora backend': ['backend', 'Express', 'Node.js', 'server'],
        '@bitacora debug': ['debug', 'log', 'error', 'Winston'],
        '@bitacora security': ['security', 'validation', 'SQL injection'],
        '@bitacora deployment': ['deployment', 'production', 'environment']
      };

      const keywords = sectionKeywords[command] || [];
      const sections = this.extractRelevantSections(content, keywords);

      return {
        content: [{
          type: 'text',
          text: `# ${description}\n\n${sections}\n\n**Context**: ${context || `Specific reference for ${command}`}\n\n**Auto-Reference**: Use these patterns for consistent implementation.`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error accessing @bitacora: ${error.message}\n\nPlease ensure docs/BITACORA_PROYECTO.md exists and is accessible.`
        }]
      };
    }
  }

  extractRelevantSections(content, keywords) {
    if (keywords.length === 0) return content;

    const lines = content.split('\n');
    const relevantSections = [];
    let currentSection = [];
    let isRelevant = false;
    let sectionDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect section headers
      if (line.startsWith('#')) {
        // Save previous section if relevant
        if (isRelevant && currentSection.length > 0) {
          relevantSections.push(currentSection.join('\n'));
        }
        
        // Start new section
        currentSection = [line];
        sectionDepth = line.match(/^#+/)[0].length;
        
        // Check if this section is relevant
        isRelevant = keywords.some(keyword => 
          line.toLowerCase().includes(keyword.toLowerCase())
        );
      } else {
        currentSection.push(line);
        
        // Check content relevance if header wasn't relevant
        if (!isRelevant) {
          isRelevant = keywords.some(keyword => 
            line.toLowerCase().includes(keyword.toLowerCase())
          );
        }
      }
    }

    // Add final section if relevant
    if (isRelevant && currentSection.length > 0) {
      relevantSections.push(currentSection.join('\n'));
    }

    return relevantSections.length > 0 ? 
      relevantSections.join('\n\n---\n\n') : 
      'No specific sections found for the requested context.';
  }

  async updateBitacora(section, content, type) {
    try {
      const timestamp = new Date().toISOString();
      const updateEntry = `\n\n## ${type.toUpperCase()}: ${section} (${timestamp})\n\n${content}\n`;
      
      await fs.appendFile(this.bitacoraPath, updateEntry);
      
      return {
        content: [{
          type: 'text',
          text: `✅ Bitácora updated successfully!\n\n**Section**: ${section}\n**Type**: ${type}\n**Timestamp**: ${timestamp}\n\n**Content Added**:\n${content}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to update bitácora: ${error.message}`
        }]
      };
    }
  }

  async searchBitacora(query) {
    try {
      const content = await fs.readFile(this.bitacoraPath, 'utf-8');
      const lines = content.split('\n');
      const matches = [];
      const queryLower = query.toLowerCase();

      let currentSection = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('#')) {
          currentSection = line;
        }
        
        if (line.toLowerCase().includes(queryLower)) {
          matches.push({
            section: currentSection,
            line: line,
            lineNumber: i + 1,
            context: this.getContext(lines, i)
          });
        }
      }

      if (matches.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `🔍 No matches found for: "${query}"\n\nTry searching for related terms or check the @bitacora command reference.`
          }]
        };
      }

      const results = matches.map(match => 
        `**${match.section}** (Line ${match.lineNumber})\n${match.context}`
      ).join('\n\n---\n\n');

      return {
        content: [{
          type: 'text',
          text: `🔍 Search Results for: "${query}"\n\n${results}\n\n**Found**: ${matches.length} matches`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Search failed: ${error.message}`
        }]
      };
    }
  }

  getContext(lines, lineIndex, contextSize = 2) {
    const start = Math.max(0, lineIndex - contextSize);
    const end = Math.min(lines.length, lineIndex + contextSize + 1);
    
    return lines.slice(start, end)
      .map((line, i) => {
        const actualIndex = start + i;
        const marker = actualIndex === lineIndex ? '👉 ' : '   ';
        return `${marker}${line}`;
      })
      .join('\n');
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Bitácora MCP Server running on stdio');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new BitacoraMCPServer();
  server.run().catch(console.error);
}

module.exports = BitacoraMCPServer;
