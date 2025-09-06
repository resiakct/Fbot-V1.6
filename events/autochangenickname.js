module.exports = {
    name: "event",
    async execute(api, event) {
        if (event.logMessageType === "log:subscribe") {
            const botID = api.getCurrentUserID();
            const threadID = event.threadID;
            const addedUsers = event.logMessageData.addedParticipants.map(user => user.userFbId);

            // Check if the bot was added to the group
            if (addedUsers.includes(botID)) {
                const botNickname = "."; // Change this to your preferred nickname

                try {
                    await api.changeNickname(botNickname, threadID, botID);
                    console.log(` `);
                } catch (error) {
                    console.error(error);
                }
            }
        }
    },
};
