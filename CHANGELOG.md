# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2024-12-28

### Added
- **MCP Tool Node**: Added `get_todo_tool` to Omnispindle presets
  - Completes the standard todo management operations
  - Default parameter: `{"todo_id": ""}`
  - Now includes all essential todo operations in quick setup

### Fixed
- **MCP Tool Node**: Enhanced error handling for tool loading
  - Better error messages for connection failures
  - Improved debugging with specific error types
  - Added validation for server URLs
  - More user-friendly error descriptions
  - Fixed potential issues with URL encoding in admin endpoints

## [1.1.2] - 2024-12-28

### Fixed - Critical Bug Fix
- **MCP Flow Server Node**: Fixed "Cannot assign to read only property 'writeQueueSize'" error
  - Issue occurred when caching server instances containing Node-RED internal objects
  - Solution: Only cache essential data instead of entire node object with TCP connections
  - Prevents uncaught exceptions that could crash Node-RED
  - Maintains full functionality while improving stability

### Technical Details
- Removed caching of entire node object in serverInstances cache
- Now only stores: nodeId, serverName, port, startTime, isRunning status
- Updated admin endpoint to work with simplified cache structure
- Tool execution continues to work normally as it uses node object directly

## [1.1.1] - 2024-12-28

### Added - Automatic MCP Handshake Discovery
- **MCP Client Node**: Automatic tool discovery for SSE and WebSocket connections
  - Automatically performs MCP handshake on connection
  - Outputs server capabilities and available tools via "handshake" topic
  - Includes tool names, descriptions, and parameter schemas
  - Provides example syntax for discovered tools
  - Includes tool count and server information
  - Perfect for debugging and understanding available MCP tools

### Enhanced
- **Better Debugging Experience**: Users can now see exactly what tools are available immediately after connecting
- **Auto-Discovery**: No need to manually request tools/list - happens automatically
- **Example Generation**: Automatically generates example parameters from tool schemas
- **Comprehensive Output**: Includes both server info and practical usage examples
- **Ready-to-Use Examples**: Added comprehensive example flows for quick start
  - External MCP Server example demonstrating client connections
  - Flow-Based MCP Server example showing visual server creation
  - Complete documentation and setup instructions

### Use Cases Enhanced
- **Rapid Development**: Instantly see available tools and their syntax
- **Debugging**: Understand server capabilities and tool interfaces
- **Tool Discovery**: Automatically discover new tools without manual requests
- **Integration Testing**: Verify expected tools are available

## [1.1.0] - 2024-12-28

### Added - Visual MCP Server Creation
- **MCP Flow Server Node**: Create complete MCP servers entirely within Node-RED
  - Full MCP protocol implementation (JSON-RPC 2.0)
  - Standard MCP endpoints: /mcp, /health, /sse
  - Tool registration and execution management
  - CORS support for web browser clients
  - Real-time Server-Sent Events streaming
  - Auto-start and port configuration
  - Global tool registry across server instances

- **MCP Tool Registry Node**: Define MCP tools using visual configuration
  - JSON Schema-based parameter definition
  - Built-in schema templates (Todo, Calculator, API, Simple)
  - Auto-registration and dynamic updates
  - Tool validation and formatting
  - Quick tool generation buttons
  - Template-based tool creation

- **Enhanced Capabilities**:
  - Complete visual alternative to coding MCP servers
  - No-code tool creation with drag-and-drop interface
  - Rapid prototyping of AI agent tools
  - Integration with existing Node-RED flows as tools
  - Real-time tool registry management

### Enhanced
- Added Express.js dependency for HTTP server functionality
- Updated package keywords for better discoverability
- Improved documentation with visual programming examples

### Use Cases Added
- **Rapid Prototyping**: Create and test MCP tools without writing code
- **Business Logic Integration**: Expose Node-RED flows as AI agent tools
- **Custom Automation**: Turn automation workflows into MCP tools
- **API Aggregation**: Combine multiple APIs into single MCP tools
- **Educational**: Learn MCP concepts through visual programming

### Technical Details - v1.1.0
- New dependencies: express ^4.18.0
- Two new node types: mcp-flow-server, mcp-tool-registry
- Global tool registry with event-based communication
- Standard MCP protocol compliance
- WebSocket and SSE support for real-time communication

## [1.0.0] - 2024-12-28

### Added
- **MCP Server Node**: Complete lifecycle management for MCP servers
  - Support for Python, Node.js, and custom server types
  - Health monitoring with automatic restarts
  - Real-time output streaming (stdout/stderr)
  - Environment variable configuration
  - Auto-start capabilities
  - Omnispindle preset configuration

- **MCP Client Node**: Multi-protocol client for MCP server communication
  - HTTP request/response support
  - Server-Sent Events (SSE) streaming
  - WebSocket full-duplex communication
  - Automatic reconnection with configurable intervals
  - Connection health monitoring
  - Request timeout handling

- **MCP Tool Node**: Simplified interface for direct tool invocation
  - Predefined tool configurations with parameter defaults
  - Dynamic tool discovery from running servers
  - Multiple output formatting modes (result, full, custom)
  - Smart parameter override system
  - Omnispindle tool presets (add_todo, list_todos, etc.)
  - JSON parameter validation and formatting

- **Core Features**:
  - Comprehensive error handling and logging
  - Admin HTTP endpoints for server/tool management
  - Built-in Omnispindle integration and presets
  - Real-time status indicators
  - Configurable timeouts and retry policies

- **Documentation**:
  - Complete README with usage examples
  - Inline help documentation for all nodes
  - Configuration guides and troubleshooting

### Technical Details
- Node.js 16+ compatibility
- Node-RED 1.0+ compatibility
- Dependencies: axios, ws, eventsource, uuid, node-cache
- MIT License

### Initial Release Features
- 3 Node-RED nodes for complete MCP ecosystem integration
- Multi-protocol support (HTTP/SSE/WebSocket)
- Health monitoring and auto-restart capabilities
- Real-time communication and event streaming
- Built-in Omnispindle MCP server integration
- Dynamic tool discovery and configuration
- Comprehensive documentation and examples
