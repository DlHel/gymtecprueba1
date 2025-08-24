// Gymtec ERP - Model Context Protocol Server
// Provides project context and @bitacora integration for Claude CLI

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

class GymtecMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'gymtec-project-context',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_bitacora_context',
            description: 'Get complete project context from @bitacora system',
            inputSchema: {
              type: 'object',
              properties: {
                section: {
                  type: 'string',
                  description: 'Specific @bitacora section (api, database, frontend, etc.)',
                  enum: ['all', 'api', 'database', 'authentication', 'frontend', 'backend', 'debug', 'security', 'deployment']
                }
              },
              required: ['section']
            }
          },
          {
            name: 'get_project_architecture',
            description: 'Get complete project architecture and technology stack',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_api_patterns',
            description: 'Get established API patterns and examples',
            inputSchema: {
              type: 'object', 
              properties: {}
            }
          },
          {
            name: 'get_security_standards',
            description: 'Get security patterns and requirements',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_bitacora_context':
            return await this.getBitacoraContext(args.section);
          
          case 'get_project_architecture':
            return await this.getProjectArchitecture();
          
          case 'get_api_patterns':
            return await this.getAPIPatterns();
          
          case 'get_security_standards':
            return await this.getSecurityStandards();
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  async getBitacoraContext(section) {
    const bitacoraPath = path.join(process.cwd(), 'docs', 'BITACORA_PROYECTO.md');
    
    try {
      const content = await fs.readFile(bitacoraPath, 'utf-8');
      
      if (section === 'all') {
        return {
          content: [{
            type: 'text',
            text: `# Complete Gymtec ERP Project Context (@bitacora)\n\n${content}`
          }]
        };
      }

      // Extract specific section
      const sectionRegex = new RegExp(`## .*${section}.*?(?=## |$)`, 'gis');
      const sectionMatch = content.match(sectionRegex);
      
      return {
        content: [{
          type: 'text',
          text: sectionMatch ? 
            `# @bitacora ${section}\n\n${sectionMatch[0]}` : 
            `Section '${section}' not found in bitácora. Available sections: api, database, authentication, frontend, backend, debug, security, deployment`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error reading bitácora: ${error.message}`
        }]
      };
    }
  }

  async getProjectArchitecture() {
    return {
      content: [{
        type: 'text',
        text: `# Gymtec ERP - Project Architecture

## Technology Stack
- **Backend**: Node.js + Express.js REST API (Port 3000)
- **Frontend**: Vanilla JavaScript + HTML + CSS with Tailwind (Port 8080) 
- **Database**: MySQL 8.0+ with 37+ tables
- **Authentication**: JWT with refresh tokens
- **File Storage**: Multer + Base64 encoding
- **Debug System**: Winston logging + VS Code integration

## Core Architecture Patterns
- **API Pattern**: REST with consistent JSON responses
- **Error Handling**: Comprehensive try-catch with structured logging
- **Validation**: Joi schema validation + input sanitization
- **Security**: Rate limiting + SQL injection prevention
- **Database**: Prepared statements with parameter validation
- **Frontend**: Module pattern with state management

## Project Structure
- \`backend/\`: Express API server with JWT authentication
- \`frontend/\`: Vanilla JS client (NO frameworks policy)
- \`docs/\`: Protected documentation with @bitacora system
- \`.vscode/\`: Professional development configuration
- \`uploads/\`: File storage directory

## Key Commands
- \`start-servers.bat\`: Start both backend and frontend
- \`F5 in VS Code\`: Debug mode with breakpoints
- \`@bitacora [section]\`: Get project context`
      }]
    };
  }

  async getAPIPatterns() {
    return {
      content: [{
        type: 'text', 
        text: `# Gymtec ERP - API Patterns

## Standard API Route Pattern
\`\`\`javascript
app.get('/api/endpoint', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        // Input validation with Joi
        const schema = joi.object({
            param: joi.string().required()
        });
        const { error, value } = schema.validate(req.query);
        
        if (error) {
            return res.status(400).json({
                error: 'Invalid input',
                code: 'VALIDATION_ERROR',
                details: error.details
            });
        }

        // Prepared SQL statement
        const sql = 'SELECT * FROM table WHERE column = ? ORDER BY created_at DESC LIMIT ?';
        const rows = await db.query(sql, [value.param, 20]);

        res.json({
            message: 'success',
            data: rows,
            metadata: { 
                count: rows.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('API Error', { error: error.message, endpoint: req.path });
        res.status(500).json({ 
            error: 'Internal server error', 
            code: 'DB_ERROR' 
        });
    }
});
\`\`\`

## Security Requirements
- ALWAYS use authenticateToken middleware
- ALWAYS validate input with Joi schemas
- ALWAYS use prepared SQL statements
- ALWAYS include comprehensive error handling
- ALWAYS log operations with context`
      }]
    };
  }

  async getSecurityStandards() {
    return {
      content: [{
        type: 'text',
        text: `# Gymtec ERP - Security Standards

## MANDATORY Security Patterns

### 1. Input Validation
- Use Joi schema validation for ALL inputs
- Sanitize strings with validator.escape()
- Validate file uploads with type/size limits
- Implement rate limiting on authentication routes

### 2. SQL Injection Prevention
- ALWAYS use prepared statements with parameters
- NEVER concatenate user input into SQL strings
- Validate all query parameters
- Use connection pooling with limits

### 3. Authentication & Authorization
- JWT tokens with refresh mechanism
- Role-based access control (RBAC)
- Session management with secure storage
- Password hashing with bcrypt (min 12 rounds)

### 4. Error Handling
- Never expose database errors to clients
- Log all errors with context and timestamps
- Use consistent error response format
- Implement global error handlers

### 5. Rate Limiting
- 5 attempts per 15 minutes for authentication
- Progressive delays for repeated failures
- IP-based and user-based limiting
- Monitoring and alerting for abuse

## Example Implementation
\`\`\`javascript
// Rate limiting middleware
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // max 5 requests per windowMs
    message: 'Too many authentication attempts'
});

// Input validation
const validateInput = (req, res, next) => {
    const schema = joi.object({
        email: joi.string().email().required(),
        password: joi.string().min(8).required()
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    
    req.validatedBody = value;
    next();
};
\`\`\``
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gymtec MCP Server running on stdio');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new GymtecMCPServer();
  server.run().catch(console.error);
}

module.exports = GymtecMCPServer;
