# node-red-contrib-mcp-server

A comprehensive Node-RED contribution package for Model Context Protocol (MCP) server integration. This package provides nodes for running MCP servers, connecting to them as clients, and invoking specific MCP tools directly from Node-RED flows.

## Features

- **🚀 MCP Server Management**: Start, stop, and monitor MCP servers directly from Node-RED
- **🔗 Multi-Protocol Support**: HTTP, Server-Sent Events (SSE), and WebSocket connections
- **🛠️ Tool Integration**: Direct invocation of MCP tools with parameter mapping
- **💾 Health Monitoring**: Automatic health checks and restart capabilities
- **📊 Real-time Communication**: Live streaming of server output and events
- **🎯 Omnispindle Integration**: Built-in presets for the Omnispindle MCP server

## Installation

### From npm (when published)
```bash
cd ~/.node-red
npm install node-red-contrib-mcp-server
```

### Manual Installation
```bash
cd ~/.node-red
git clone <repository-url> node_modules/node-red-contrib-mcp-server
cd node_modules/node-red-contrib-mcp-server
npm install
```

### Local Development
```bash
cd /path/to/node-red-contrib-mcp-server
npm link
cd ~/.node-red
npm link node-red-contrib-mcp-server
```

## Nodes

### 🖥️ MCP Server Node

Manages the lifecycle of MCP server processes.

**Key Features:**
- Start/stop MCP servers (Python, Node.js, or custom commands)
- Health monitoring with automatic restarts
- Real-time output streaming
- Environment variable configuration
- Port management

**Configuration:**
- **Server Type**: Python, Node.js, or Custom
- **Server Path**: Path to server script/executable
- **Server Arguments**: Command line arguments
- **Port**: Server port number
- **Auto Start**: Start with Node-RED
- **Health Checks**: Monitor server health
- **Restart Policy**: Automatic restart on failure

**Input Commands:**
- `start`: Start the server
- `stop`: Stop the server  
- `restart`: Restart the server
- `status`: Get current status

**Output Topics:**
- `stdout`: Server standard output
- `stderr`: Server error output
- `started`: Server startup event
- `exit`: Server exit event

### 🔗 MCP Client Node

Connects to and communicates with MCP servers.

**Key Features:**
- Multiple connection types (HTTP, SSE, WebSocket)
- Automatic reconnection
- Request/response handling
- Real-time event streaming
- Connection pooling

**Configuration:**
- **Server URL**: MCP server endpoint
- **Connection Type**: HTTP, SSE, or WebSocket
- **Auto Connect**: Connect on startup
- **Reconnect**: Auto-reconnect on disconnect
- **Timeout**: Request timeout

**Input Commands:**
- `connect`: Establish connection
- `disconnect`: Close connection
- `request`: Send MCP request
- `status`: Get connection status

**Output Topics:**
- `connected`: Connection established
- `response`: MCP response received
- `message`: General server message
- `error`: Error occurred
- `raw`: Unparsed message data

### ⚙️ MCP Tool Node

Simplified interface for invoking specific MCP tools.

**Key Features:**
- Predefined tool configurations
- Parameter mapping and overrides
- Output formatting options
- Dynamic tool discovery
- Omnispindle tool presets

**Configuration:**
- **Server URL**: MCP server endpoint
- **Tool Name**: MCP tool to invoke
- **Default Parameters**: JSON parameter defaults
- **Output Mode**: Result formatting
- **Timeout**: Request timeout

**Parameter Override Priority:**
1. Message-specific properties (`msg.description`, `msg.project`, etc.)
2. `msg.payload.params` object
3. `msg.payload` (if object without method)
4. Default parameters from configuration

**Output Modes:**
- **Result Only**: Extract result from MCP response
- **Full Response**: Complete MCP JSON-RPC response
- **Custom**: Preserve original message, add response

## Examples

### Basic MCP Server Setup

```javascript
// Use MCP Server node with these settings:
// Server Type: Python
// Server Path: src/Omnispindle/__init__.py
// Server Args: --host 0.0.0.0 --port 8000
// Auto Start: true
```

### Client Connection and Tool Call

```javascript
// Connect to MCP server
msg.topic = "connect";
return msg;

// Later: Call a tool
msg.topic = "request";
msg.payload = {
    method: "add_todo_tool",
    params: {
        description: "Implement MCP integration",
        project: "NodeRED"
    }
};
return msg;
```

### Direct Tool Invocation

```javascript
// Configure MCP Tool node for "add_todo_tool"
// Then send:
msg.description = "New task from Node-RED";
msg.project = "MyProject";
msg.priority = "High";
return msg;
```

### Server Lifecycle Management

```javascript
// Start server
msg.topic = "start";
return msg;

// Monitor output
// Connect to stdout output and process server logs

// Stop server when done
msg.topic = "stop";
return msg;
```

## Omnispindle Integration

This package includes built-in support for the Omnispindle MCP server:

### Available Tools
- `add_todo_tool` - Create new todos
- `list_todos_by_status_tool` - List todos by status
- `update_todo_tool` - Update existing todos
- `delete_todo_tool` - Delete todos
- `mark_todo_complete_tool` - Mark todos complete
- `list_project_todos_tool` - List project todos
- `query_todos_tool` - Search/query todos

### Quick Setup
1. Use "Load Omnispindle Preset" buttons in node configurations
2. Automatically configures for local Omnispindle server
3. Sets appropriate connection types and parameters

## Advanced Usage

### Health Monitoring Flow

```javascript
// MCP Server node output → Function node:
if (msg.topic === "stdout" && msg.payload.includes("error")) {
    // Alert on errors
    return {topic: "alert", payload: "Server error detected"};
}
if (msg.topic === "exit" && msg.payload.code !== 0) {
    // Server crashed
    return {topic: "restart", payload: {}};
}
```

### Dynamic Tool Discovery

```javascript
// Function node to get available tools:
msg.topic = "request";
msg.payload = {
    method: "tools/list",
    params: {}
};
return msg;

// Process response to populate UI or routing
```

### Connection Failover

```javascript
// Function node for client failover:
if (msg.topic === "error") {
    // Try backup server
    msg.topic = "connect";
    msg.payload = {serverUrl: "http://backup:8000"};
    return msg;
}
```

## API Endpoints

The package exposes additional HTTP endpoints:

- `GET /mcp-servers` - List running MCP servers
- `GET /mcp-tools/:serverUrl` - Get available tools from server

## Requirements

### System Requirements
- Node.js 16.0.0 or higher
- Node-RED 1.0.0 or higher

### MCP Server Requirements
- **Python servers**: Python 3.8+ with required packages
- **Node.js servers**: Node.js 16+ with required packages  
- **Custom servers**: Executable in PATH or full path specified

### Dependencies
- `axios` - HTTP client
- `ws` - WebSocket support
- `eventsource` - Server-Sent Events
- `uuid` - Unique ID generation
- `node-cache` - Server instance caching

## Troubleshooting

### Server Won't Start
- Check server path exists and is executable
- Verify Python/Node.js environment
- Check port availability
- Review server arguments syntax

### Connection Issues
- Verify server is running and accessible
- Check firewall settings
- Confirm correct URL and port
- Test with simple HTTP health check

### Tool Calls Fail
- Ensure server supports the requested tool
- Validate parameter JSON syntax
- Check server logs for errors
- Verify authentication if required

### Performance Issues
- Adjust health check intervals
- Configure appropriate timeouts
- Use connection pooling for high volume
- Monitor server resource usage

## Development

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

### Testing
```bash
npm test
```

### Building
```bash
npm run build
```

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- MCP Server, Client, and Tool nodes
- Omnispindle integration
- Multi-protocol support
- Health monitoring
- Auto-restart capabilities

## Support

- 📖 [Documentation](https://github.com/MadnessEngineering/node-red-contrib-mcp-server)
- 🐛 [Issues](https://github.com/MadnessEngineering/node-red-contrib-mcp-server/issues)
- 💬 [Discussions](https://github.com/MadnessEngineering/node-red-contrib-mcp-server/discussions)

## Related Projects

- [Omnispindle](https://github.com/MadnessEngineering/Omnispindle) - FastMCP-based todo management system
- [FastMCP](https://github.com/jlowin/fastmcp) - Model Context Protocol server framework
- [Node-RED](https://nodered.org/) - Flow-based programming for the Internet of Things 
