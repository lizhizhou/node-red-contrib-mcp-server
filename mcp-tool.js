module.exports = function (RED)
{
    "use strict";

    const axios = require('axios');

    function MCPToolNode(config)
    {
        RED.nodes.createNode(this, config);
        const node = this;

        // Configuration
        node.serverUrl = config.serverUrl || "http://localhost:8000";
        node.toolName = config.toolName || "";
        node.toolParams = config.toolParams || "{}";
        node.timeout = config.timeout || 30000;
        node.outputMode = config.outputMode || "result";

        // Set initial status
        node.status({ fill: "grey", shape: "ring", text: "ready" });

        // Parse tool parameters
        let parsedParams = {};
        try
        {
            parsedParams = JSON.parse(node.toolParams);
        } catch (error)
        {
            node.warn(`Invalid tool parameters JSON: ${error.message}`);
        }

        // Tool invocation function
        node.invokeTool = function (method, params, callback)
        {
            node.status({ fill: "yellow", shape: "ring", text: "calling..." });

            const request = {
                jsonrpc: "2.0",
                id: Date.now(),
                method: method,
                params: params
            };

            axios.post(`${node.serverUrl}/mcp`, request, {
                timeout: node.timeout,
                headers: { 'Content-Type': 'application/json' }
            })
                .then(response =>
                {
                    node.status({ fill: "green", shape: "dot", text: "success" });

                    // Reset status after a delay
                    setTimeout(() =>
                    {
                        node.status({ fill: "grey", shape: "ring", text: "ready" });
                    }, 2000);

                    callback(null, response.data);
                })
                .catch(error =>
                {
                    node.status({ fill: "red", shape: "dot", text: "error" });

                    // Reset status after a delay
                    setTimeout(() =>
                    {
                        node.status({ fill: "grey", shape: "ring", text: "ready" });
                    }, 3000);

                    callback(error);
                });
        };

        // Handle input messages
        node.on('input', function (msg)
        {
            // Determine tool method
            let method = node.toolName;
            if (msg.topic && msg.topic !== "")
            {
                method = msg.topic;
            }
            if (msg.payload && msg.payload.method)
            {
                method = msg.payload.method;
            }

            if (!method)
            {
                node.warn("No tool method specified");
                return;
            }

            // Determine parameters
            let params = Object.assign({}, parsedParams);

            // Override with message payload parameters
            if (msg.payload && typeof msg.payload === 'object' && msg.payload.params)
            {
                params = Object.assign(params, msg.payload.params);
            } else if (msg.payload && typeof msg.payload === 'object' && !msg.payload.method)
            {
                // If payload is an object without method, treat it as parameters
                params = Object.assign(params, msg.payload);
            }

            // Override with specific message properties
            if (msg.description) params.description = msg.description;
            if (msg.project) params.project = msg.project;
            if (msg.todo_id) params.todo_id = msg.todo_id;
            if (msg.status) params.status = msg.status;
            if (msg.priority) params.priority = msg.priority;

            // Invoke the tool
            node.invokeTool(method, params, (error, response) =>
            {
                if (error)
                {
                    msg.error = error.message;
                    msg.topic = "error";
                    msg.payload = { error: error.message };
                    node.send(msg);
                    return;
                }

                // Format output based on mode
                switch (node.outputMode)
                {
                    case "result":
                        // Extract result from MCP response
                        if (response && response.result)
                        {
                            msg.payload = response.result;
                        } else
                        {
                            msg.payload = response;
                        }
                        break;

                    case "full":
                        // Full MCP response
                        msg.payload = response;
                        break;

                    case "custom":
                        // Keep original message, add response
                        msg.response = response;
                        msg.result = response && response.result ? response.result : response;
                        break;
                }

                msg.topic = "result";
                node.send(msg);
            });
        });
    }

    // Register the node
    RED.nodes.registerType("mcp-tool", MCPToolNode);

    // Get available tools from server
    RED.httpAdmin.get("/mcp-tools/:serverUrl", function (req, res)
    {
        const serverUrl = decodeURIComponent(req.params.serverUrl);

        const request = {
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/list",
            params: {}
        };

        axios.post(`${serverUrl}/mcp`, request, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        })
            .then(response =>
            {
                if (response.data && response.data.result && response.data.result.tools)
                {
                    res.json({ tools: response.data.result.tools });
                } else
                {
                    res.json({ tools: [] });
                }
            })
            .catch(error =>
            {
                res.status(500).json({ error: error.message });
            });
    });
}; 
