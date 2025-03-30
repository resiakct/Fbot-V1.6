 const fs = require('fs');
const path = require('path');
const express = require('express');
const login = require('ws3-fca');
const scheduleTasks = require('./custom'); // Import scheduled tasks

const app = express();
const PORT = 3000;

// Load bot config safely
const loadConfig = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Missing ${filePath}! Make sure it exists.`);
            process.exit(1);
        }
        return JSON.parse(fs.readFileSync(filePath));
    } catch (error) {
        console.error(`❌ Error loading ${filePath}:`, error);
        process.exit(1);
    }
};

const config = loadConfig("./config.json");
const botPrefix = config.prefix || "/";

// Global events and commands
global.events = new Map();
global.commands = new Map();

// Function to load event handlers
const loadEvents = () => {
    try {
        const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(`./events/${file}`);
            if (event.name && event.execute) {
                global.events.set(event.name, event);
                console.log(`✅ Loaded event: ${event.name}`);
            }
        }
        console.log(`✅ Loaded ${global.events.size} events.`);
    } catch (error) {
        console.error("❌ Error loading events:", error);
    }
};

// Function to load commands
const loadCommands = () => {
    try {
        const commandFiles = fs.readdirSync('./cmds').filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`./cmds/${file}`);
            if (command.name && command.execute) {
                global.commands.set(command.name, command);
                console.log(`✅ Loaded command: ${command.name}`);
            }
        }
        console.log(`✅ Loaded ${global.commands.size} commands.`);
    } catch (error) {
        console.error("❌ Error loading commands:", error);
    }
};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html on root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start HTTP Server
app.listen(PORT, () => {
    console.log(`🌐 Web Server running at http://localhost:${PORT}`);
});

// Load Facebook bot state
const appState = loadConfig("./appState.json");

// ✅ Store detected URLs per thread (conversation)
const detectedURLs = new Set();

// Function to start the bot
const startBot = async () => {
    try {
        login({ appState }, (err, api) => {
            if (err) {
                console.error("❌ Login failed:", err);
                setTimeout(startBot, 5000);
                return;
            }

            console.clear();
            api.setOptions(config.option);
            console.log("🤖 Bot is now online!");

            // Notify the owner
            const ownerID = config.ownerID || "100030880666720"; // Set owner ID from config
            api.sendMessage("🤖 Bot has started successfully!", ownerID);

            // Run startup events
            global.events.forEach((eventHandler, eventName) => {
                if (eventHandler.onStart) {
                    eventHandler.onStart(api);
                }
            });

            // ✅ **Listen to Facebook messages**
            api.listenMqtt(async (err, event) => {
                if (err) {
                    console.error("❌ Error listening to events:", err);
                    return;
                }

                // Process event-based functions
                if (global.events.has(event.type)) {
                    try {
                        await global.events.get(event.type).execute(api, event);
                    } catch (error) {
                        console.error(`❌ Error in event '${event.type}':`, error);
                    }
                }

                // ✅ **Prevent duplicate URL detections per chat**
                const urlRegex = /(https?:\/\/[^\s]+)/gi;
                if (event.body && urlRegex.test(event.body)) {
                    const urlCommand = global.commands.get("url");
                    if (urlCommand) {
                        const detectedURL = event.body.match(urlRegex)[0]; // Extract first URL
                        const threadID = event.threadID;
                        const uniqueKey = `${threadID}-${detectedURL}`;

                        if (detectedURLs.has(uniqueKey)) return; // Skip duplicate responses

                        detectedURLs.add(uniqueKey);
                        try {
                            await urlCommand.execute(api, event);
                        } catch (error) {
                            console.error(`❌ Error in URL detection:`, error);
                        }

                        // Remove URL record after 1 hour
                        setTimeout(() => detectedURLs.delete(uniqueKey), 3600000);
                    }
                }

                // ✅ **Process commands**
                if (event.body) {
                    let args = event.body.trim().split(/ +/);
                    let commandName = args.shift().toLowerCase();

                    let command;
                    if (global.commands.has(commandName)) {
                        command = global.commands.get(commandName);
                    } else if (event.body.startsWith(botPrefix)) {
                        commandName = event.body.slice(botPrefix.length).split(/ +/).shift().toLowerCase();
                        command = global.commands.get(commandName);
                    }

                    if (command) {
                        if (command.usePrefix && !event.body.startsWith(botPrefix)) return;
                        try {
                            await command.execute(api, event, args);
                        } catch (error) {
                            console.error(`❌ Error executing command '${commandName}':`, error);
                        }
                    }
                }
            });

            // Set up auto-restart and auto-greet
            scheduleTasks(ownerID, api, { autoRestart: true, autoGreet: true });
        });
    } catch (error) {
        console.error("❌ Bot crashed. Restarting in 5 seconds...", error);
        setTimeout(startBot, 5000);
    }
};

// Load events and commands before starting the bot
loadEvents();
loadCommands();
startBot();
