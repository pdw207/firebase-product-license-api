import axios from "axios";

// Replace 'YOUR_SLACK_WEBHOOK_URL' with the actual webhook URL provided by Slack.
const slackWebhookUrl =
  "https://hooks.slack.com/services/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";

type SlackBody = {
  [key: string]: string;
};

function formatSlackMessage(title: string, body: SlackBody) {
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

export default async function sendMessageToSlack(
  title: string,
  body: SlackBody,
) {
  try {
    const payload = formatSlackMessage(title, body);
    // Send the message to Slack using Axios HTTP POST request.
    await axios.post(slackWebhookUrl, payload);
  } catch (error) {
    console.error("Error sending message to Slack:", error);
    throw new Error("Failed to send message to Slack.");
  }
}
