"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
// Replace 'YOUR_SLACK_WEBHOOK_URL' with the actual webhook URL provided by Slack.
const slackWebhookUrl = "https://hooks.slack.com/services/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";
function formatSlackMessage(title, body) {
    // Format the JSON object as a bulleted list.
    const formattedBody = Object.keys(body)
        .map((key) => `• ${key}: ${body[key]}`)
        .join("\n");
    // Create the Slack message payload.
    const payload = {
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*${title}*`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: formattedBody,
                },
            },
        ],
    };
    return payload;
}
async function sendMessageToSlack(title, body) {
    try {
        const payload = formatSlackMessage(title, body);
        // Send the message to Slack using Axios HTTP POST request.
        await axios_1.default.post(slackWebhookUrl, payload);
    }
    catch (error) {
        console.error("Error sending message to Slack:", error);
        throw new Error("Failed to send message to Slack.");
    }
}
exports.default = sendMessageToSlack;
//# sourceMappingURL=sendMessageToSlack.js.map