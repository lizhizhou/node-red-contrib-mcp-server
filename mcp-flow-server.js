module.exports = function (RED)
{
    "use strict";

    const http = require('http');
    const express = require('express');
    const { v4: uuidv4 } = require('uuid');
    const NodeCache = require('node-cache');

    // Global registry for tools across all flow server instances
    const toolRegistry = new NodeCache({ stdTTL: 0 });
    const serverInstances = new NodeCache({ stdTTL: 0 });

    function MCPFlowServerNode(config)
    {
        RED.nodes.createNode(this, config);
        const node = this;

        // Configuration
        node.serverName = config.serverName || "node-red-mcp-server";
        node.serverPort = config.serverPort || 8001;
        node.autoStart = config.autoStart || false;
        node.enableCors = config.enableCors || true;

        // Runtime state
        node.httpServer = null;
        node.app = null;
        node.isRunning = false;
        node.serverId = uuidv4();

        // Set initial status
        node.status({ fill: "grey", shape: "ring", text: "stopped" });

        // Initialize Express app
        node.initializeServer = function ()
        {
            node.app = express();

            // Enable CORS if configured
            if (node.enableCors)
            {
                node.app.use((req, res, next) =>
                {
                    res.header('Access-Control-Allow-Origin', '*');
                    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                    if (req.method === 'OPTIONS')
                    {
                        res.sendStatus(200);
                    } else
                    {
                        next();
                    }
                });
            }

            // JSON parsing middleware
            node.app.use(express.json({ limit: '10mb' }));

            // Health check endpoint
            node.app.get('/health', (req, res) =>
            {
                res.json({
                    status: 'healthy',
                    server: node.serverName,
                    uptime: process.uptime(),
                    tools: Object.keys(toolRegistry.keys()).length
                });
            });

            // MCP JSON-RPC endpoint
            node.app.post('/mcp', async (req, res) =>
            {
                try
                {
                    const request = req.body;
                    node.log(`MCP Request: ${JSON.stringify(request)}`);

                    // Handle different MCP methods
                    switch (request.method)
                    {
                        case 'tools/list':
                            node.handleToolsList(request, res);
                            break;

                        case 'tools/call':
                            await node.handleToolCall(request, res);
                            break;

                        case 'initialize':
                            node.handleInitialize(request, res);
                            break;

                        default:
                            if (request.method && request.method.endsWith('_tool'))
                            {
                                // Direct tool call
                                await node.handleDirectToolCall(request, res);
                            } else
                            {
                                res.json({
                                    jsonrpc: "2.0",
                                    id: request.id,
                                    error: {
                                        code: -32601,
                                        message: `Method not found: ${request.method}`
                                    }
                                });
                            }
                    }
                } catch (error)
                {
                    node.error(`MCP request error: ${error.message}`);
                    res.status(500).json({
                        jsonrpc: "2.0",
                        id: req.body.id,
                        error: {
                            code: -32603,
                            message: "Internal error",
                            data: error.message
                        }
                    });
                }
            });

            // Server-Sent Events endpoint
            node.app.get('/sse', (req, res) =>
            {
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                });

                res.write('data: {"type":"connected","server":"' + node.serverName + '"}\n\n');

                // Keep connection alive
                const keepAlive = setInterval(() =>
                {
                    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
                }, 30000);

                req.on('close', () =>
                {
                    clearInterval(keepAlive);
                });
            });
        };

        // Handle tools/list method
        node.handleToolsList = function (request, res)
        {
            const tools = [];
            const toolKeys = toolRegistry.keys();

            toolKeys.forEach(key =>
            {
                const tool = toolRegistry.get(key);
                if (tool)
                {
                    tools.push({
                        name: tool.name,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                }
            });

            res.json({
                jsonrpc: "2.0",
                id: request.id,
                result: { tools: tools }
            });
        };

        // Handle tools/call method
        node.handleToolCall = async function (request, res)
        {
            const { name, arguments: args } = request.params;
            const tool = toolRegistry.get(name);

            if (!tool)
            {
                res.json({
                    jsonrpc: "2.0",
                    id: request.id,
                    error: {
                        code: -32602,
                        message: `Tool not found: ${name}`
                    }
                });
                return;
            }

            try
            {
                const result = await node.executeToolFlow(tool, args);
                res.json({
                    jsonrpc: "2.0",
                    id: request.id,
                    result: result
                });
            } catch (error)
            {
                res.json({
                    jsonrpc: "2.0",
                    id: request.id,
                    error: {
                        code: -32603,
                        message: error.message
                    }
                });
            }
        };

        // Handle direct tool calls (method ends with _tool)
        node.handleDirectToolCall = async function (request, res)
        {
            const toolName = request.method;
            const tool = toolRegistry.get(toolName);

            if (!tool)
            {
                res.json({
                    jsonrpc: "2.0",
                    id: request.id,
                    error: {
                        code: -32602,
                        message: `Tool not found: ${toolName}`
                    }
                });
                return;
            }

            try
            {
                const result = await node.executeToolFlow(tool, request.params || {});
                res.json({
                    jsonrpc: "2.0",
                    id: request.id,
                    result: result
                });
            } catch (error)
            {
                res.json({
                    jsonrpc: "2.0",
                    id: request.id,
                    error: {
                        code: -32603,
                        message: error.message
                    }
                });
            }
        };

        // Handle initialize method
        node.handleInitialize = function (request, res)
        {
            res.json({
                jsonrpc: "2.0",
                id: request.id,
                result: {
                    protocolVersion: "2024-11-05",
                    capabilities: {
                        tools: {
                            listChanged: true
                        }
                    },
                    serverInfo: {
                        name: node.serverName,
                        version: "1.0.0",
                        description: "Node-RED MCP Flow Server"
                    }
                }
            });
        };

        // Execute tool flow
        node.executeToolFlow = function (tool, args)
        {
            return new Promise((resolve, reject) =>
            {
                // Send execution request to tool handler nodes
                const executionMsg = {
                    topic: 'mcp-tool-execute',
                    payload: {
                        toolName: tool.name,
                        arguments: args,
                        executionId: uuidv4()
                    }
                };

                // Set up timeout
                const timeout = setTimeout(() =>
                {
                    reject(new Error('Tool execution timeout'));
                }, 30000);

                // Listen for response
                const responseHandler = (msg) =>
                {
                    if (msg.topic === 'mcp-tool-response' &&
                        msg.payload.executionId === executionMsg.payload.executionId)
                    {
                        clearTimeout(timeout);
                        node.removeListener('input', responseHandler);

                        if (msg.payload.error)
                        {
                            reject(new Error(msg.payload.error));
                        } else
                        {
                            resolve(msg.payload.result);
                        }
                    }
                };

                node.on('input', responseHandler);

                // Send execution request
                node.send(executionMsg);
            });
        };

        // Start server
        node.startServer = function (callback = () => { })
        {
            if (node.isRunning)
            {
                callback(null, { success: false, message: "Server already running" });
                return;
            }

            node.status({ fill: "yellow", shape: "ring", text: "starting..." });

            try
            {
                node.initializeServer();

                node.httpServer = http.createServer(node.app);

                node.httpServer.listen(node.serverPort, () =>
                {
                    node.isRunning = true;
                    node.status({ fill: "green", shape: "dot", text: `running :${node.serverPort}` });

                    // Store in global registry - use only primitive values to avoid cloning issues
                    const cacheData = {
                        nodeId: String(node.id),
                        serverName: String(node.serverName),
                        port: Number(node.serverPort),
                        startTime: new Date().toISOString(),
                        isRunning: Boolean(true)
                    };
                    serverInstances.set(node.serverId, cacheData);

                    node.log(`MCP Flow Server started on port ${node.serverPort}`);

                    // Send started message
                    node.send({
                        topic: "mcp-server-started",
                        payload: {
                            serverId: node.serverId,
                            serverName: node.serverName,
                            port: node.serverPort,
                            startTime: new Date()
                        }
                    });

                    callback(null, { success: true, message: "Server started" });
                });

                node.httpServer.on('error', (error) =>
                {
                    node.error(`Server error: ${error.message}`);
                    node.status({ fill: "red", shape: "dot", text: "error" });
                    callback(error);
                });

            } catch (error)
            {
                node.error(`Failed to start server: ${error.message}`);
                node.status({ fill: "red", shape: "dot", text: "error" });
                callback(error);
            }
        };

        // Stop server
        node.stopServer = function (callback = () => { })
        {
            if (!node.isRunning)
            {
                callback(null, { success: true, message: "Server already stopped" });
                return;
            }

            node.status({ fill: "yellow", shape: "ring", text: "stopping..." });

            if (node.httpServer)
            {
                node.httpServer.close(() =>
                {
                    node.isRunning = false;
                    node.status({ fill: "grey", shape: "ring", text: "stopped" });
                    serverInstances.del(node.serverId);

                    node.send({
                        topic: "mcp-server-stopped",
                        payload: { serverId: node.serverId }
                    });

                    callback(null, { success: true, message: "Server stopped" });
                });
            } else
            {
                node.isRunning = false;
                node.status({ fill: "grey", shape: "ring", text: "stopped" });
                callback(null, { success: true, message: "Server stopped" });
            }
        };

        // Handle input messages
        node.on('input', function (msg)
        {
            const command = msg.topic || msg.payload.command;

            switch (command)
            {
                case 'start':
                    node.startServer();
                    break;

                case 'stop':
                    node.stopServer();
                    break;

                case 'restart':
                    node.stopServer(() =>
                    {
                        setTimeout(() => node.startServer(), 1000);
                    });
                    break;

                case 'status':
                    msg.payload = {
                        serverId: node.serverId,
                        serverName: node.serverName,
                        isRunning: node.isRunning,
                        port: node.serverPort,
                        toolCount: toolRegistry.keys().length
                    };
                    node.send(msg);
                    break;
            }
        });

        // Auto-start if configured
        if (node.autoStart)
        {
            setTimeout(() => node.startServer(), 1000);
        }

        // Cleanup on node close
        node.on('close', function (done)
        {
            if (node.isRunning)
            {
                node.stopServer(() => done());
            } else
            {
                done();
            }
        });
    }

    // Register the node
    RED.nodes.registerType("mcp-flow-server", MCPFlowServerNode);

    // Expose tool registry functions for other nodes
    RED.events.on('mcp-tool-register', (toolDef) =>
    {
        toolRegistry.set(toolDef.name, toolDef);
    });

    RED.events.on('mcp-tool-unregister', (toolName) =>
    {
        toolRegistry.del(toolName);
    });

    // Admin endpoint to list flow servers
    RED.httpAdmin.get("/mcp-flow-servers", function (req, res)
    {
        const servers = [];
        serverInstances.keys().forEach(key =>
        {
            const server = serverInstances.get(key);
            if (server)
            {
                servers.push({
                    serverId: key,
                    serverName: server.serverName,
                    isRunning: server.isRunning,
                    port: server.port,
                    startTime: server.startTime,
                    toolCount: toolRegistry.keys().length
                });
            }
        });
        res.json({ servers });
    });
}; 
