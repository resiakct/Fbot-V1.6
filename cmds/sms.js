const axios = require("axios");

module.exports = {
    name: "sms",
    usePrefix: false,
    usage: "sms <phone_number> <message>",
    version: "1.0",

    async execute(api, event, args) {
        if (args.length < 2) {
            return api.sendMessage("❌ Usage: sms <phone_number> <message>", event.threadID);
        }

        const phoneNumber = args[0];
        const message = args.slice(1).join(" ");
        const apiUrl = `https://kenlie.top/api/freesms-ph/?number=${encodeURIComponent(phoneNumber)}&message=${encodeURIComponent(message)}`;

        try {
            const response = await axios.get(apiUrl);
            if (response.data.status) {
                const { message, network } = response.data.response;
                api.sendMessage(`✅ SMS Sent!\n📩 Message: ${message}\n📡 Network: ${network}`, event.threadID);
            } else {
                api.sendMessage("❌ Failed to send SMS. Please try again.", event.threadID);
            }
        } catch (error) {
            console.error("❌ Error fetching SMS API:", error);
            api.sendMessage("❌ An error occurred while sending the SMS.", event.threadID);
        }
    }
};
