# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
