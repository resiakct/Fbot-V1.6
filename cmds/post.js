const fs = require("fs");

module.exports = {
    name: "post",
    usePrefix: false,
    usage: "post <message> (or reply with an image attachment and tag users)",
    version: "1.5",
    description: "Creates a Facebook post with tagging support.",

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, mentions } = event;
        let postMessage = args.join(" ");

        // If users are mentioned, format their tags
        let formattedMentions = [];
        if (mentions && Object.keys(mentions).length > 0) {
            for (const uid in mentions) {
                const tagName = mentions[uid].replace("@", ""); // Get the mentioned user's name
                const tagPosition = postMessage.indexOf(`@${tagName}`); // Find where the tag is in the message

                if (tagPosition !== -1) {
                    formattedMentions.push({ tag: `@${tagName}`, id: uid, fromIndex: tagPosition });
                }
            }
        }

        // Post data with mentions
        const postData = {
            body: postMessage,
            mentions: formattedMentions.length > 0 ? formattedMentions : undefined
        };

        // Create the post
        api.createPost(postData)
            .then((url) => {
                api.sendMessage(`✅ Post created successfully!\n🔗 ${url}`, threadID, messageID);
            })
            .catch((error) => {
                api.sendMessage(`❌ Error creating post:\n${error.message}`, threadID, messageID);
            });
    }
};
