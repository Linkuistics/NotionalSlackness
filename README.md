# Slack Channel Summarizer with Notion Integration

This project is a TypeScript-based tool that automatically summarizes messages from a Slack channel and updates two Notion pages: one for topic summaries and another for a changelog. It uses OpenAI's GPT model to process and summarize the content.

## Features

- Fetches new messages from a specified Slack channel
- Uses OpenAI's GPT model to summarize and organize the content
- Updates two Notion pages with the summarized information
- Runs incrementally, processing only new messages since the last run

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14 or later) installed on your machine
- npm (usually comes with Node.js)
- A Slack workspace with API access
- An OpenAI API key
- A Notion account with API access

## Setup

1. Clone this repository:

   ```
   git clone https://github.com/your-username/slack-summarizer.git
   cd slack-summarizer
   ```

2. Install the required dependencies:

   ```
   npm install
   ```

3. Set up your environment variables by creating a `.env` file in the project root:

   ```
   SLACK_API_TOKEN=your_slack_api_token
   OPENAI_API_KEY=your_openai_api_key
   SLACK_CHANNEL_ID=your_slack_channel_id
   NOTION_API_KEY=your_notion_api_key
   NOTION_TOPICS_PAGE_ID=your_topics_summary_page_id
   NOTION_CHANGELOG_PAGE_ID=your_changelog_page_id
   ```

   Replace the placeholders with your actual API keys and IDs.

4. Obtain the necessary API keys and IDs:

   - **Slack API Token**:

     1. Go to https://api.slack.com/apps
     2. Create a new app or select an existing one
     3. Go to "OAuth & Permissions" and find the "Bot User OAuth Token"

   - **Slack Channel ID**:

     1. Right-click on the channel in Slack
     2. Select "Copy link"
     3. The channel ID is the last part of the URL

   - **OpenAI API Key**:

     1. Go to https://platform.openai.com/account/api-keys
     2. Create a new secret key

   - **Notion API Key**:

     1. Go to https://www.notion.so/my-integrations
     2. Create a new integration
     3. Copy the "Internal Integration Token"

   - **Notion Page IDs**:
     1. Create two pages in your Notion workspace (one for Topics Summary, one for Changelog)
     2. Share these pages with your integration (click "Share" and invite your integration)
     3. The page ID is the part of the URL after the workspace name and before the question mark

5. Ensure your Notion integration has access to the pages you want to update:
   1. Open each Notion page
   2. Click "Share" in the top right
   3. Invite your integration to the page

## Usage

To run the script:

```
npx ts-node summarizer.ts
```

This will:

1. Fetch new messages from the specified Slack channel
2. Process and summarize the messages using OpenAI's GPT model
3. Update the specified Notion pages with the summarized content

## Scheduling

To run this script automatically on a schedule, you can use a task scheduler:

### On Unix-based systems (using cron):

1. Open your crontab file:

   ```
   crontab -e
   ```

2. Add a line to run the script every two weeks:

   ```
   0 0 1,15 * * cd /path/to/your/project && /usr/local/bin/ts-node summarizer.ts >> /path/to/logfile.log 2>&1
   ```

   This will run the script at midnight on the 1st and 15th of each month.

### On Windows:

1. Open Task Scheduler
2. Create a new task
3. Set the trigger to run on your desired schedule
4. Set the action to start a program:
   - Program/script: `C:\Path\To\Node\node.exe`
   - Add arguments: `C:\Path\To\Project\node_modules\ts-node\dist\bin.js C:\Path\To\Project\summarizer.ts`
   - Start in: `C:\Path\To\Project`

## Customization

- To modify the AI prompt or the way content is summarized, edit the `updateDocumentsWithAI` function in `summarizer.ts`.
- To change how Notion pages are updated, modify the `updateNotionPage` function.

## Troubleshooting

- If you encounter rate limiting issues with any of the APIs, you may need to implement additional error handling and retry logic.
- Ensure all your API keys and tokens have the necessary permissions.
- Check the console output and any error messages for debugging information.

## Contributing

Contributions to this project are welcome. Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
