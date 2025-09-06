const fs = require('fs');
const configPath = "./config.json";

const config = JSON.parse(fs.readFileSync(configPath));

let spamInterval = null;

module.exports = {
  name: "chat",
  usePrefix: false,
  usage: "chat",
  version: "1.0",

  execute: async ({ api, event }) => {
    const messageToSend1 = "ano buhay ka pa?";
    const messageToSend2 = "wala ka nang pag asa";
    const startKeyword = "hahaha";
    const stopKeyword = "saan na";

    if (spamInterval) {
      clearInterval(spamInterval);
    }
    
    if (event.body.toLowerCase() === startKeyword) {
      let messageIndex = 0;
      const messages = [messageToSend1, messageToSend2];

      spamInterval = setInterval(() => {
        const message = messages[messageIndex];
        api.sendMessage(message, event.threadID);

        messageIndex = (messageIndex + 1) % messages.length;
      }, 1000);
    } 
    else if (event.body.toLowerCase() === stopKeyword) {
      clearInterval(spamInterval);
      spamInterval = null;
      api.sendMessage("Spamming stopped.", event.threadID, event.messageID);
    }
  }
};
  
