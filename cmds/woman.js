const fs = require("fs");
const path = require("path");

module.exports = {
    name: "women",
    usePrefix: false,
    usage: "Trigger: 'women' or 'babae' (anywhere in the message)",
    version: "1.1",
    description: "Sends a video response when the message contains 'women' or 'babae'.",

    execute(api, event, args) {
        const { threadID, messageID, body } = event;
        const lowerCaseBody = body.toLowerCase();

        if (lowerCaseBody.includes("women") || lowerCaseBody.includes("babae")) {
            const videoPath = path.join(__dirname, "Women.mp4");

            if (!fs.existsSync(videoPath)) {
                return api.sendMessage("⚠️ Video file not found.", threadID, messageID);
            }

            const msg = {
                body: "Pogi kung owner Mark 👑",
                attachment: fs.createReadStream(videoPath),
            };

            api.sendMessage(msg, threadID, messageID);
            api.setMessageReaction("☕", messageID, (err) => {
                if (err) console.error("Error setting reaction:", err);
            });
        }
    },
};
