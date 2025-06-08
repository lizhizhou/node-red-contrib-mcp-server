# Node-RED MCP Server Examples

This directory contains example flows demonstrating how to use the node-red-contrib-mcp-server package. These flows can be imported directly into Node-RED to get started quickly.

## Example Flows

### 1. External MCP Server Example
**File:** `external-mcp-server-example.json`

**Purpose:** Demonstrates connecting to an external MCP server (like Omnispindle) and calling tools.

**What it shows:**
- Connecting to external MCP servers using the MCP Client node
- Automatic tool discovery via SSE handshake
- Direct tool calls through the client
- Using dedicated MCP Tool nodes for specific operations
- Handling responses and debugging

**Setup:**
1. Ensure an MCP server is running (e.g., Omnispindle on `localhost:8000`)
2. Import the flow: Menu → Import → Select `external-mcp-server-example.json`
3. Deploy the flow
4. Watch the debug output as it auto-connects and discovers tools
5. Click the inject nodes to test different operations

**Features demonstrated:**
- ✅ Auto-connect with SSE
- ✅ Handshake tool discovery
- ✅ Add todo via direct client call
- ✅ List todos via MCP Tool node
- ✅ Debug output for all responses

### 2. Flow-Based MCP Server Example
**File:** `flow-based-mcp-server-example.json`

**Purpose:** Demonstrates creating a complete MCP server within Node-RED using visual flows.

**What it shows:**
- Creating MCP servers entirely in Node-RED
- Defining custom tools with JSON schemas
- Implementing tool logic using function nodes
- Serving tools to external clients
- Testing your own MCP server

**Setup:**
1. Import the flow: Menu → Import → Select `flow-based-mcp-server-example.json`
2. Deploy the flow
3. The MCP server will start on port 8001
4. Click "Connect to Server" to test the server
5. Try the calculator and greeting tools

**Features demonstrated:**
- ✅ Complete MCP server in Node-RED (port 8001)
- ✅ Custom calculator tool with math operations
- ✅ Custom greeting tool with multi-language support
- ✅ Auto-registration of tools
- ✅ Tool execution routing and implementation
- ✅ Self-testing with built-in client

## How to Import

### Method 1: File Import
1. In Node-RED, go to Menu (☰) → Import
2. Select "select a file to import"
3. Choose one of the example JSON files
4. Click "Import"

### Method 2: Copy & Paste
1. Open the example JSON file in a text editor
2. Copy the entire contents
3. In Node-RED, go to Menu (☰) → Import
4. Paste the JSON into the text area
5. Click "Import"

## Testing the Examples

### External Server Example
```bash
# Ensure Omnispindle is running first
cd /path/to/omnispindle
python -m src.Omnispindle.main

# Then deploy the Node-RED flow and watch the debug output
```

### Flow Server Example
```bash
# Test the server from command line
curl -X POST http://localhost:8001/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# Test calculator tool
curl -X POST http://localhost:8001/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "calculate_tool",
    "params": {
      "operation": "multiply",
      "a": 7,
      "b": 6
    }
  }'

# Test greeting tool
curl -X POST http://localhost:8001/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "greet_user_tool",
    "params": {
      "name": "Node-RED User",
      "language": "spanish",
      "formal": false
    }
  }'
```

## Understanding the Examples

### Node Types Used

#### External Server Example:
- **MCP Client**: Connects to external MCP servers
- **MCP Tool**: Simplified interface for calling specific tools
- **Debug**: Shows responses and handshake information
- **Inject**: Triggers test operations

#### Flow Server Example:
- **MCP Flow Server**: Creates complete MCP server in Node-RED
- **MCP Tool Registry**: Defines available tools with schemas
- **Function**: Implements tool logic
- **Switch**: Routes tool execution requests
- **Debug**: Shows tool execution results

### Key Concepts

1. **Handshake Discovery**: SSE connections automatically discover available tools
2. **Tool Registration**: Tools are registered globally and available to all flow servers
3. **Execution Flow**: Tool calls flow from client → server → router → handler → response
4. **Error Handling**: Both examples include proper error handling and validation

## Customization

### Adding New Tools to Flow Server
1. Add a new MCP Tool Registry node
2. Define the tool name, description, and JSON schema
3. Add logic to the router switch node
4. Create a function node to implement the tool
5. Connect the function output back to the flow server

### Connecting to Different Servers
1. Change the serverUrl in MCP Client nodes
2. Update any hardcoded tool names in MCP Tool nodes
3. Adjust parameters based on the target server's tools

## Troubleshooting

### External Server Example Issues
- **Connection failed**: Ensure the external MCP server is running
- **No tools discovered**: Check the server URL and that it supports SSE
- **Tool calls fail**: Verify tool names and parameters match the server

### Flow Server Example Issues
- **Port already in use**: Change the serverPort in the MCP Flow Server node
- **Tools not found**: Ensure Tool Registry nodes are deployed and auto-register is enabled
- **Execution errors**: Check function node logic and parameter validation

## Next Steps

After trying these examples:
1. Modify the tools to suit your needs
2. Create new tools for your specific use cases
3. Integrate with external APIs and databases
4. Build complex workflows using the MCP protocol
5. Share your MCP servers with AI agents and other clients

For more information, see the main package documentation and Node-RED help panels for each node type. 
