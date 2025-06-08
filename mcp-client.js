module.exports = function (RED)
{
    "use strict";

    const axios = require('axios');
    const EventSource = require('eventsource');
    const WebSocket = require('ws');
    const { v4: uuidv4 } = require('uuid');

    function MCPClientNode(config)
    {
        RED.nodes.createNode(this, config);
        const node = this;

        // Configuration
        node.serverUrl = config.serverUrl || "http://localhost:8000";
        node.connectionType = config.connectionType || "http";
        node.autoConnect = config.autoConnect || false;
        node.reconnect = config.reconnect || true;
        node.reconnectInterval = config.reconnectInterval || 5000;
        node.timeout = config.timeout || 30000;

        // Runtime state
        node.isConnected = false;
        node.connection = null;
        node.reconnectTimer = null;
        node.pendingRequests = new Map();

        // Set initial status
        node.status({ fill: "grey", shape: "ring", text: "disconnected" });

        // Connect function
        node.connect = function (callback = () => { })
        {
            if (node.isConnected)
            {
                callback(null, { success: true, message: "Already connected" });
                return;
            }

            node.status({ fill: "yellow", shape: "ring", text: "connecting..." });

            try
            {
                switch (node.connectionType)
                {
                    case "http":
                        node.connectHTTP(callback);
                        break;
                    case "sse":
                        node.connectSSE(callback);
                        break;
                    case "websocket":
                        node.connectWebSocket(callback);
                        break;
                    default:
                        const error = new Error(`Unsupported connection type: ${node.connectionType}`);
                        node.error(error);
                        callback(error);
                }
            } catch (error)
            {
                node.error(`Connection error: ${error.message}`);
                node.status({ fill: "red", shape: "dot", text: "error" });
                callback(error);
            }
        };

        // HTTP connection (polling-based)
        node.connectHTTP = function (callback)
        {
            // Test connection with a health check
            axios.get(`${node.serverUrl}/health`, { timeout: node.timeout })
                .then(response =>
                {
                    node.isConnected = true;
                    node.status({ fill: "green", shape: "dot", text: "connected (HTTP)" });

                    // Send connection event
                    node.send({
                        topic: "connected",
                        payload: {
                            serverUrl: node.serverUrl,
                            connectionType: "http",
                            serverInfo: response.data
                        }
                    });

                    callback(null, { success: true, message: "HTTP connection established" });
                })
                .catch(error =>
                {
                    node.isConnected = false;
                    node.status({ fill: "red", shape: "dot", text: "connection failed" });
                    callback(error);

                    if (node.reconnect)
                    {
                        node.scheduleReconnect();
                    }
                });
        };

        // Server-Sent Events connection
        node.connectSSE = function (callback)
        {
            try
            {
                const sseUrl = `${node.serverUrl}/sse`;
                node.connection = new EventSource(sseUrl);

                node.connection.onopen = function (event)
                {
                    node.isConnected = true;
                    node.status({ fill: "green", shape: "dot", text: "connected (SSE)" });

                    // Send connection event
                    node.send({
                        topic: "connected",
                        payload: {
                            serverUrl: node.serverUrl,
                            connectionType: "sse",
                            event: event
                        }
                    });

                    callback(null, { success: true, message: "SSE connection established" });
                };

                node.connection.onmessage = function (event)
                {
                    try
                    {
                        const data = JSON.parse(event.data);

                        // Handle MCP protocol messages
                        if (data.id && node.pendingRequests.has(data.id))
                        {
                            const request = node.pendingRequests.get(data.id);
                            clearTimeout(request.timeout);
                            node.pendingRequests.delete(data.id);

                            // Send response
                            node.send({
                                topic: "response",
                                payload: data,
                                requestId: data.id
                            });
                        } else
                        {
                            // Send general message
                            node.send({
                                topic: "message",
                                payload: data
                            });
                        }
                    } catch (parseError)
                    {
                        node.warn(`Failed to parse SSE message: ${parseError.message}`);

                        // Send raw message
                        node.send({
                            topic: "raw",
                            payload: event.data
                        });
                    }
                };

                node.connection.onerror = function (error)
                {
                    node.error(`SSE connection error: ${error.message || 'Unknown error'}`);
                    node.isConnected = false;
                    node.status({ fill: "red", shape: "dot", text: "SSE error" });

                    if (node.reconnect)
                    {
                        node.scheduleReconnect();
                    }
                };

            } catch (error)
            {
                callback(error);
            }
        };

        // WebSocket connection
        node.connectWebSocket = function (callback)
        {
            try
            {
                const wsUrl = node.serverUrl.replace(/^http/, 'ws') + '/ws';
                node.connection = new WebSocket(wsUrl);

                node.connection.on('open', function ()
                {
                    node.isConnected = true;
                    node.status({ fill: "green", shape: "dot", text: "connected (WS)" });

                    // Send connection event
                    node.send({
                        topic: "connected",
                        payload: {
                            serverUrl: node.serverUrl,
                            connectionType: "websocket"
                        }
                    });

                    callback(null, { success: true, message: "WebSocket connection established" });
                });

                node.connection.on('message', function (data)
                {
                    try
                    {
                        const message = JSON.parse(data.toString());

                        // Handle MCP protocol messages
                        if (message.id && node.pendingRequests.has(message.id))
                        {
                            const request = node.pendingRequests.get(message.id);
                            clearTimeout(request.timeout);
                            node.pendingRequests.delete(message.id);

                            // Send response
                            node.send({
                                topic: "response",
                                payload: message,
                                requestId: message.id
                            });
                        } else
                        {
                            // Send general message
                            node.send({
                                topic: "message",
                                payload: message
                            });
                        }
                    } catch (parseError)
                    {
                        node.warn(`Failed to parse WebSocket message: ${parseError.message}`);

                        // Send raw message
                        node.send({
                            topic: "raw",
                            payload: data.toString()
                        });
                    }
                });

                node.connection.on('error', function (error)
                {
                    node.error(`WebSocket connection error: ${error.message}`);
                    node.isConnected = false;
                    node.status({ fill: "red", shape: "dot", text: "WS error" });

                    if (node.reconnect)
                    {
                        node.scheduleReconnect();
                    }
                });

                node.connection.on('close', function (code, reason)
                {
                    node.log(`WebSocket connection closed: ${code} ${reason}`);
                    node.isConnected = false;
                    node.status({ fill: "grey", shape: "ring", text: "disconnected" });

                    if (node.reconnect && code !== 1000)
                    { // 1000 = normal closure
                        node.scheduleReconnect();
                    }
                });

            } catch (error)
            {
                callback(error);
            }
        };

        // Disconnect function
        node.disconnect = function (callback = () => { })
        {
            if (!node.isConnected)
            {
                callback(null, { success: true, message: "Already disconnected" });
                return;
            }

            node.status({ fill: "yellow", shape: "ring", text: "disconnecting..." });

            if (node.reconnectTimer)
            {
                clearTimeout(node.reconnectTimer);
                node.reconnectTimer = null;
            }

            try
            {
                if (node.connection)
                {
                    if (node.connectionType === "sse")
                    {
                        node.connection.close();
                    } else if (node.connectionType === "websocket")
                    {
                        node.connection.close(1000, "Normal closure");
                    }
                    node.connection = null;
                }

                node.isConnected = false;
                node.status({ fill: "grey", shape: "ring", text: "disconnected" });

                // Clear pending requests
                node.pendingRequests.forEach((request, id) =>
                {
                    clearTimeout(request.timeout);
                });
                node.pendingRequests.clear();

                callback(null, { success: true, message: "Disconnected" });

            } catch (error)
            {
                node.error(`Disconnect error: ${error.message}`);
                callback(error);
            }
        };

        // Schedule reconnection
        node.scheduleReconnect = function ()
        {
            if (node.reconnectTimer) return;

            node.reconnectTimer = setTimeout(() =>
            {
                node.reconnectTimer = null;
                if (!node.isConnected)
                {
                    node.log("Attempting to reconnect...");
                    node.connect();
                }
            }, node.reconnectInterval);
        };

        // Send MCP request
        node.sendRequest = function (method, params = {}, callback)
        {
            if (!node.isConnected)
            {
                const error = new Error("Not connected to MCP server");
                if (callback) callback(error);
                return;
            }

            const requestId = uuidv4();
            const request = {
                jsonrpc: "2.0",
                id: requestId,
                method: method,
                params: params
            };

            try
            {
                switch (node.connectionType)
                {
                    case "http":
                        // HTTP POST request
                        axios.post(`${node.serverUrl}/mcp`, request, {
                            timeout: node.timeout,
                            headers: { 'Content-Type': 'application/json' }
                        })
                            .then(response =>
                            {
                                if (callback) callback(null, response.data);

                                node.send({
                                    topic: "response",
                                    payload: response.data,
                                    requestId: requestId
                                });
                            })
                            .catch(error =>
                            {
                                if (callback) callback(error);

                                node.send({
                                    topic: "error",
                                    payload: { error: error.message, requestId: requestId }
                                });
                            });
                        break;

                    case "sse":
                        // For SSE, we need to use HTTP POST for requests and listen for responses
                        axios.post(`${node.serverUrl}/mcp`, request, {
                            timeout: node.timeout,
                            headers: { 'Content-Type': 'application/json' }
                        })
                            .then(response =>
                            {
                                if (callback) callback(null, response.data);
                            })
                            .catch(error =>
                            {
                                if (callback) callback(error);
                            });
                        break;

                    case "websocket":
                        // WebSocket send
                        node.connection.send(JSON.stringify(request));

                        // Set up timeout for response
                        const timeoutHandler = setTimeout(() =>
                        {
                            node.pendingRequests.delete(requestId);
                            const error = new Error("Request timeout");
                            if (callback) callback(error);

                            node.send({
                                topic: "error",
                                payload: { error: "Request timeout", requestId: requestId }
                            });
                        }, node.timeout);

                        // Store pending request
                        node.pendingRequests.set(requestId, {
                            callback: callback,
                            timeout: timeoutHandler
                        });
                        break;
                }
            } catch (error)
            {
                if (callback) callback(error);
                node.error(`Send request error: ${error.message}`);
            }
        };

        // Handle input messages
        node.on('input', function (msg)
        {
            const command = msg.topic || msg.payload.command;

            switch (command)
            {
                case 'connect':
                    node.connect((error, result) =>
                    {
                        if (!error)
                        {
                            msg.payload = result;
                            node.send(msg);
                        }
                    });
                    break;

                case 'disconnect':
                    node.disconnect((error, result) =>
                    {
                        if (!error)
                        {
                            msg.payload = result;
                            node.send(msg);
                        }
                    });
                    break;

                case 'request':
                    const method = msg.payload.method;
                    const params = msg.payload.params || {};

                    if (!method)
                    {
                        node.warn("Request method is required");
                        return;
                    }

                    node.sendRequest(method, params, (error, response) =>
                    {
                        if (error)
                        {
                            msg.payload = { error: error.message };
                            msg.topic = "error";
                        } else
                        {
                            msg.payload = response;
                            msg.topic = "response";
                        }
                        node.send(msg);
                    });
                    break;

                case 'status':
                    msg.payload = {
                        isConnected: node.isConnected,
                        serverUrl: node.serverUrl,
                        connectionType: node.connectionType,
                        pendingRequests: node.pendingRequests.size
                    };
                    node.send(msg);
                    break;

                default:
                    node.warn(`Unknown command: ${command}`);
            }
        });

        // Auto-connect if configured
        if (node.autoConnect)
        {
            setTimeout(() =>
            {
                node.connect();
            }, 1000);
        }

        // Cleanup on node close
        node.on('close', function (done)
        {
            node.disconnect(() =>
            {
                done();
            });
        });
    }

    // Register the node
    RED.nodes.registerType("mcp-client", MCPClientNode);
}; 
