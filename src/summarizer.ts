import { WebClient } from '@slack/web-api';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { Configuration, OpenAIApi } from 'openai';
import { Client } from '@notionhq/client';

dotenv.config();

const slackToken = process.env.SLACK_API_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const channelId = process.env.SLACK_CHANNEL_ID;
const notionApiKey = process.env.NOTION_API_KEY;
const topicsSummaryPageId = process.env.NOTION_TOPICS_PAGE_ID;
const changelogPageId = process.env.NOTION_CHANGELOG_PAGE_ID;

if (
    !slackToken ||
    !openaiApiKey ||
    !channelId ||
    !notionApiKey ||
    !topicsSummaryPageId ||
    !changelogPageId
) {
    console.error(
        'Missing required environment variables. Please check your .env file.'
    );
    process.exit(1);
}

const slack = new WebClient(slackToken);
const openai = new OpenAIApi(new Configuration({ apiKey: openaiApiKey }));
const notion = new Client({ auth: notionApiKey });

interface Message {
    text: string;
    ts: string;
}

async function fetchNewMessages(
    channelId: string,
    lastTimestamp: number
): Promise<Message[]> {
    try {
        const result = await slack.conversations.history({
            channel: channelId,
            oldest: lastTimestamp.toString()
        });
        return result.messages as Message[];
    } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
}

async function getNotionPageContent(pageId: string): Promise<string> {
    try {
        const response = await notion.blocks.children.list({
            block_id: pageId
        });
        let content = '';
        for (const block of response.results) {
            if ('paragraph' in block) {
                content +=
                    block.paragraph.rich_text
                        .map((text) => text.plain_text)
                        .join('') + '\n\n';
            }
        }
        return content.trim();
    } catch (error) {
        console.error(`Error reading Notion page ${pageId}:`, error);
        return '';
    }
}

async function updateNotionPage(
    pageId: string,
    content: string
): Promise<void> {
    try {
        // First, archive existing content
        const existingBlocks = await notion.blocks.children.list({
            block_id: pageId
        });
        for (const block of existingBlocks.results) {
            await notion.blocks.delete({ block_id: block.id });
        }

        // Then, add new content
        await notion.blocks.children.append({
            block_id: pageId,
            children: [
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content } }]
                    }
                }
            ]
        });
    } catch (error) {
        console.error(`Error updating Notion page ${pageId}:`, error);
    }
}

async function updateDocumentsWithAI(
    newMessages: Message[],
    topicsSummary: string,
    changelog: string
): Promise<[string, string]> {
    const newContent = newMessages.map((msg) => msg.text).join('\n');

    const prompt = `
  You are an AI assistant helping to organize and summarize Slack messages.

  Here are the new Slack messages:
  ${newContent}

  Current Topics Summary:
  ${topicsSummary}

  Current Changelog:
  ${changelog}

  Please update both the Topics Summary and the Changelog based on the new messages. 
  For the Topics Summary, integrate new information into existing topics or create new topics as needed.
  For the Changelog, add a new section for the current date with a summary of key updates.

  Respond with two sections: UPDATED TOPICS SUMMARY and UPDATED CHANGELOG.
  `;

    try {
        const response = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a helpful assistant that organizes and summarizes information.'
                },
                { role: 'user', content: prompt }
            ]
        });

        const aiResponse = response.data.choices[0]?.message?.content;
        if (!aiResponse) throw new Error('No response from AI');

        const [updatedTopics, updatedChangelog] =
            aiResponse.split('UPDATED CHANGELOG');
        return [
            updatedTopics.replace('UPDATED TOPICS SUMMARY', '').trim(),
            updatedChangelog.trim()
        ];
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        return [topicsSummary, changelog];
    }
}

async function getLastProcessedTimestamp(): Promise<number> {
    const filePath = path.join(__dirname, 'last_processed.txt');
    try {
        const timestamp = await fs.readFile(filePath, 'utf-8');
        return parseFloat(timestamp.trim());
    } catch (error) {
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        await fs.writeFile(filePath, twoWeeksAgo.toString(), 'utf-8');
        return twoWeeksAgo;
    }
}

async function saveLastProcessedTimestamp(timestamp: number): Promise<void> {
    const filePath = path.join(__dirname, 'last_processed.txt');
    await fs.writeFile(filePath, timestamp.toString(), 'utf-8');
}

async function main() {
    try {
        const lastTimestamp = await getLastProcessedTimestamp();
        const newMessages = await fetchNewMessages(channelId!, lastTimestamp);

        if (newMessages.length > 0) {
            const topicsSummary = await getNotionPageContent(
                topicsSummaryPageId!
            );
            const changelog = await getNotionPageContent(changelogPageId!);

            const [updatedTopics, updatedChangelog] =
                await updateDocumentsWithAI(
                    newMessages,
                    topicsSummary,
                    changelog
                );

            await updateNotionPage(topicsSummaryPageId!, updatedTopics);
            await updateNotionPage(changelogPageId!, updatedChangelog);

            await saveLastProcessedTimestamp(parseFloat(newMessages[0].ts));

            console.log('Notion pages updated successfully.');
        } else {
            console.log('No new messages to process.');
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main();
