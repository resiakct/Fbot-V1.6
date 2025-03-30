const fs = require('fs');
const configPath = "./config.json";

// Load bot configuration
const config = JSON.parse(fs.readFileSync(configPath));

module.exports = {
    name: "prefix",
    usePrefix: false,
    usage: "prefix",
    version: "1.0",

    execute: async ({ api, event }) => {
        const botPrefix = config.prefix || "/";
        const botName = config.botName || "My Bot";

        let message = `🤖 *Bot Information* 🤖\n`;
        message += `📌 *Prefix:* ${botPrefix}\n`;
        message += `🆔 *Bot Name:* ${botName}`;

        api.sendMessage(message, event.threadID, event.messageID);
    }
};
