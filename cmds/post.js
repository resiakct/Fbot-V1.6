const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports = {
    name: "post",
    usePrefix: false,
    usage: "post <message> [@user | UID] (or reply with an image attachment)",
    version: "2.0",
    description: "Creates a Facebook post with a message, mentions a user if in a group chat, and supports attachments.",

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments: eventAttachments, mentions } = event;
        let postMessage = args.join(" ").trim();
        let taggedUsers = [];
        let groupMentions = [];

        // Validate message input
        if (!postMessage && !messageReply) {
            return api.sendMessage("❌ Error: You must provide a message for the post.", threadID, messageID);
        }

        // Extract UID (Supports both `1000xxxxxx` and `<1000xxxxxx>`)
        const uidRegex = /(?:<)?(\d{15,20})(?:>)?/g;
        let match;
        while ((match = uidRegex.exec(postMessage)) !== null) {
            const userID = match[1];
            taggedUsers.push({
                id: userID,
                tag: `@User`,
                fromIndex: postMessage.indexOf(match[0])
            });
            postMessage = postMessage.replace(match[0], `@User`);
        }

        // If in a group, use @mentions instead of just tagging by UID
        if (Object.keys(mentions).length > 0) {
            for (const [mentionID, mentionTag] of Object.entries(mentions)) {
                groupMentions.push({
                    id: mentionID,
                    tag: mentionTag,
                    fromIndex: postMessage.indexOf(mentionTag)
                });
            }
        }

        let attachments = [];

        try {
            // Check if the user replied to a message with attachments
            if (messageReply?.attachments?.length > 0) {
                attachments = messageReply.attachments;
            } else if (eventAttachments.length > 0) {
                attachments = eventAttachments;
            }

            // Download attachments if available
            const files = [];
            for (const attachment of attachments) {
                const filePath = path.join(__dirname, attachment.filename);

                const fileResponse = await axios({
                    url: attachment.url,
                    method: "GET",
                    responseType: "stream",
                    headers: { "User-Agent": "Mozilla/5.0" }
                });

                const writer = fs.createWriteStream(filePath);
                fileResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on("finish", resolve);
                    writer.on("error", reject);
                });

                files.push(fs.createReadStream(filePath));
            }

            // Create post data with mentions
            const postData = { body: postMessage };
            if (taggedUsers.length > 0) postData.mentions = taggedUsers;
            if (files.length > 0) postData.attachment = files;

            // Send message with mentions in group chat
            let finalMessage = postMessage;
            let finalMentions = taggedUsers.length > 0 ? taggedUsers : groupMentions;

            api.createPost(postData)
                .then((url) => {
                    if (url) {
                        api.sendMessage({ 
                            body: `✅ Post created successfully!\n🔗 ${url}\n\n${finalMessage}`, 
                            mentions: finalMentions 
                        }, threadID, messageID);
                    } else {
                        api.sendMessage({ 
                            body: `✅ Post created, but no URL was returned.\n\n${finalMessage}`, 
                            mentions: finalMentions 
                        }, threadID, messageID);
                    }
                })
                .catch((error) => {
                    if (error?.data?.story_create?.story?.url) {
                        return api.sendMessage({ 
                            body: `✅ Post created successfully!\n🔗 ${error.data.story_create.story.url}\n⚠️ (Note: Post created with server warnings)\n\n${finalMessage}`, 
                            mentions: finalMentions 
                        }, threadID, messageID);
                    }

                    let errorMessage = "❌ An unknown error occurred.";
                    if (error?.errors?.length > 0) {
                        errorMessage = error.errors.map((e) => e.message).join("\n");
                    } else if (error.message) {
                        errorMessage = error.message;
                    }

                    api.sendMessage(`❌ Error creating post:\n${errorMessage}`, threadID, messageID);
                })
                .finally(() => {
                    // Delete temporary files
                    files.forEach((file) => fs.unlink(file.path, (err) => {
                        if (err) console.error("❌ Error deleting file:", err);
                    }));
                });

        } catch (error) {
            console.error("❌ Error processing post:", error);
            api.sendMessage("❌ An error occurred while creating the post.", threadID, messageID);
        }
    }
};
