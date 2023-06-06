import { Client } from "@notionhq/client"
export default defineComponent({
    props: {
        notion: {
            type: "app",
            app: "notion",
        }
    },
    async run({ steps, $ }) {
        // Config
        const maxBlocksToSendAtATime = 80
        const whisperRate = 0.006
        const gptTurboRate = 0.002

        // Functions
        const chunkArrayReducer = (chunkSize) =>
            (acc, curr, i) => {
                if (i % chunkSize == 0) {
                    acc.push([curr])
                } else {
                    acc[acc.length - 1].push(curr)
                }
                return acc
            }

        const simpleRichText = (content) => ({
            rich_text: [
                {
                    text: {
                        content
                    }
                }
            ]
        })

        const createHeader = (header, type = 1) => ({
            [`heading_${type}`]: simpleRichText(header)
        })

        const createHeaderAndItems = (header, itemType, items) => {
            if (items.length === 0) {
                return []
            }

            const optionalItems = []
            if (header === "Arguments and Areas for Improvement") {
                optionalItems.push({
                    "callout": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": "These are potential arguments and rebuttals that other people may bring up in response to the transcript. Like every other part of this summary document, factual accuracy is not guaranteed."
                                }
                            }
                        ],
                        "icon": {
                            "emoji": "⚠️"
                        },
                        "color": "orange_background"
                    }
                })
            }

            return [
                createHeader(header, 2),
                ...optionalItems,
                ...items.map(item => ({
                    [itemType]: simpleRichText(item)
                }))
            ]
        }

        // Execution
        const duration = steps.get_duration.$return_value
        const transcriptionCost = Number(((steps.get_duration.$return_value / 60) * whisperRate))
        const chatCost = Number(((steps.format_chat.$return_value.tokens / 1000) * gptTurboRate))
        const totalCost = Number(transcriptionCost + chatCost)

        const formattedChat = steps.format_chat.$return_value
        const info = {
            ...formattedChat,
            recordingLink: steps.trigger.event.webViewLink,
            transcript: steps.make_paragraphs.$return_value.transcript,
            long_summary: steps.make_paragraphs.$return_value.summary,
            transcriptionCost: `Transcription Cost: $${transcriptionCost.toFixed(3).toString()}`,
            chatCost: `Chat API Cost: $${chatCost.toFixed(3).toString()}`,
            totalCost: `Total Cost: $${totalCost.toFixed(3).toString()}`,
            metadata: [
                `Sentiment: ${formattedChat.sentiment}`,
                `Transcription Cost: $${transcriptionCost.toFixed(3).toString()}`,
                `Chat API Cost: $${chatCost.toFixed(3).toString()}`,
                `Total Cost: $${totalCost.toFixed(3).toString()}`
            ]
        }

        const createPagePayload = {
            parent: {
                type: "database_id",
                database_id: process.env.NOTES_DB_ID
            },
            icon: {
                type: "emoji",
                emoji: "🤖"
            },
            properties: {
                Title: {
                    title: [
                        {
                            text: {
                                content: info.title
                            }
                        }
                    ]
                },
                Type: {
                    select: {
                        name: "AI Transcription"
                    }
                },
                "AI Cost": {
                    number: Math.round(totalCost * 1000) / 1000
                },
                "Duration (Seconds)": {
                    number: duration
                }
            },
            children: [
                {
                    callout: {
                        rich_text: [
                            {
                                text: {
                                    content: "This is an AI transcription. "
                                }
                            },
                            {
                                text: {
                                    content: "Listen to the original recording here.",
                                    link: {
                                        url: info.recordingLink
                                    }
                                }
                            }
                        ],
                        icon: {
                            emoji: "🤖"
                        },
                        color: "yellow_background"
                    }
                },
                {
                    toggle: {
                        ...simpleRichText("Table of Contents"),
                        color: "blue_background",
                        children: [{
                            table_of_contents: {}
                        }]
                    }
                }
            ]
        }

        // Create the page in Notion
        const notion = new Client({ auth: this.notion.$auth.oauth_access_token });
        console.log(`Calling Notion to create page with payload ${JSON.stringify(createPagePayload)}`)
        const response = await notion.pages.create(createPagePayload)
        const createdPageId = response.id.replace(/-/g, '')

        // Create page details, then chunk them by number of blocks and update the created page
        const children = [
            ...createHeaderAndItems("Summary", "paragraph", info.long_summary),
            ...createHeaderAndItems("Main Points", "bulleted_list_item", info.main_points),
            ...createHeaderAndItems("Potential Action Items", "to_do", info.action_items),
            ...createHeaderAndItems("Stories, Examples, and Citations", "bulleted_list_item", info.stories),
            ...createHeaderAndItems("Follow-Up Questions", "bulleted_list_item", info.follow_up),
            ...createHeaderAndItems("Arguments and Areas for Improvement", "bulleted_list_item", info.arguments),
            ...createHeaderAndItems("Full Transcript", "paragraph", info.transcript),
            ...createHeaderAndItems("Metadata", "bulleted_list_item", info.metadata),
        ]

        for (let childrenChunk of children.reduce(chunkArrayReducer(maxBlocksToSendAtATime), [])) {
            const updatePagePayload = {
                block_id: createdPageId,
                children: childrenChunk
            }
            console.log(`Calling Notion to append page with payload ${JSON.stringify(updatePagePayload)}`)
            await notion.blocks.children.append(updatePagePayload)
        }

    },
})