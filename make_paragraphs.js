import natural from 'natural'

export default defineComponent({
    async run({ steps, $ }) {
        // Config
        const sentencesPerParagraph = 3
        const maxCharsPerParagraph = 800

        // Functions
        const splitParagraphIfOverMaxChars = (paragraph, maxChars) => {
            const chunks = paragraph.match(new RegExp(`.{${maxChars}}[^\s]*\s*`, "g")) ?? [];
            const chunkedLength = chunks.join('').length
            const leftOverContent =
                paragraph.length > chunkedLength ?
                    [paragraph.slice(chunkedLength)] :
                    [];
            return [...chunks, ...leftOverContent];
        }

        const chunkArrayReducer = (chunkSize) =>
            (acc, curr, i) => {
                if (i % chunkSize == 0) {
                    acc.push([curr])
                } else {
                    acc[acc.length - 1].push(curr)
                }
                return acc
            }

        // Execution
        const tokenizer = new natural.SentenceTokenizer()

        const entries = Object.entries({
            transcript: steps.create_transcription.$return_value.transcription,
            summary: steps.format_chat.$return_value.summary
        }).map(([k, v]) => {
            const paragraphs = tokenizer
                // Split into sentences
                .tokenize(v)
                // Group into paragraph arrays by sentence count
                .reduce(chunkArrayReducer(sentencesPerParagraph), [])
                // Join paragraph arrays into paragraphs
                .map(sentenceGroup => sentenceGroup.join(' '))
                // Split up too long paragraphs
                .map(paragraph => splitParagraphIfOverMaxChars(paragraph, maxCharsPerParagraph))
                // Flatten back out if any were split
                .flat()
            return [k, paragraphs]
        })

        return Object.fromEntries(entries)
    },
})