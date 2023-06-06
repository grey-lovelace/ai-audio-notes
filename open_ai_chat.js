import { Configuration, OpenAIApi } from "openai"
import { encode, decode } from "gpt-3-encoder"

export default defineComponent({
    props: {
        openai: {
            type: "app",
            app: "openai",
        }
    },
    async run({ steps, $ }) {
        // Config
        const tokenSoftCap = 2000
        const transcript = steps.create_transcription.$return_value.transcription
        const systemPrompt = `
You are an assistant that only speaks JSON. Do not write normal text.

Example formatting:

{
    "title": "Notion Buttons",
    "summary": "A collection of buttons for Notion",
    "action_items": [
        "item 1",
        "item 2",
        "item 3"
    ],
    "follow_up": [
        "item 1",
        "item 2",
        "item 3"
    ],
    "arguments": [
        "item 1",
        "item 2",
        "item 3"
    ],
    "related_topics": [
        "item 1",
        "item 2",
        "item 3"
    ]
    "sentiment": "positive"
}
`
        const userPrompt = (transcriptChunk) => `
Analyze the transcript provided below, then provide the following:
Key "title:" - add a title.
Key "summary" - create a summary.
Key "main_points" - add an array of the main points. Limit each item to 100 words, and limit the list to 10 items.
Key "action_items:" - add an array of action items. Limit each item to 100 words, and limit the list to 5 items.
Key "follow_up:" - add an array of follow-up questions. Limit each item to 100 words, and limit the list to 5 items.
Key "stories:" - add an array of an stories, examples, or cited works found in the transcript. Limit each item to 200 words, and limit the list to 5 items.
Key "arguments:" - add an array of potential arguments against the transcript. Limit each item to 100 words, and limit the list to 5 items.
Key "related_topics:" - add an array of topics related to the transcript. Limit each item to 100 words, and limit the list to 5 items.
Key "sentiment" - add a sentiment analysis

Ensure that the final element of any array within the JSON object is not followed by a comma.

Transcript:

${transcriptChunk}
`

        // Functions
        const splitTranscriptByTokenLength = (transcript, tokenSoftCap) => {
            const encodedTranscript = encode(transcript)

            let currentIndex = 0
            const transcriptChunks = []
            while (currentIndex < encodedTranscript.length) {
                let endIndex = Math.min(currentIndex + tokenSoftCap, encodedTranscript.length)

                // Find the next period and include it
                while (endIndex < encodedTranscript.length && decode([encodedTranscript[endIndex - 1]]) !== ".") {
                    endIndex++
                }

                // Add the current chunk to the stringsArray
                const chunk = encodedTranscript.slice(currentIndex, endIndex)
                transcriptChunks.push(decode(chunk))

                currentIndex = endIndex
            }

            return transcriptChunks
        }

        const callOpenApi = async (openAiApi, payload) => {
            let retries = 3
            while (retries > 0) {
                try {
                    return await openAiApi.createChatCompletion(payload);
                } catch (error) {
                    if (error.response?.status === 500) {
                        retries--
                        if (retries == 0) {
                            throw new Error("Failed to get a response from OpenAI Chat API after 3 attempts.")
                        }
                        console.log("OpenAI Chat API returned a 500 error. Retrying...")
                    } else {
                        throw error
                    }
                }
            }
        }

        // Execute
        const openAiApi = new OpenAIApi(new Configuration({
            apiKey: this.openai.$auth.api_key,
        }))

        const responses = splitTranscriptByTokenLength(transcript, tokenSoftCap)
            .map((transcriptChunk) => userPrompt(transcriptChunk))
            .map((prompt) => ({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "user", content: prompt },
                    { role: "system", content: systemPrompt }
                ],
                temperature: 0.2
            }))
            .map(payload => callOpenApi(openAiApi, payload))

        return await Promise.all(responses)
    },
})