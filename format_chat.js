export default defineComponent({
    async run({ steps, $ }) {

        const resultsArray = steps.openai_chat.$return_value
            .map((result) => {
                // Need some code that will ensure we only get the JSON portion of the response
                // This should be the entire response already, but we can't always trust GPT
                const jsonString = result.data.choices[0].message.content
                    .replace(/^[^\{]*?{/, '{')
                    .replace(/\}[^}]*?$/, '}')
                    .replace(/,\s*(?=])/g, '') // remove trailing JSON commas

                return {
                    choice: JSON.parse(jsonString),
                    usage: result.data.usage.total_tokens ?? 0
                }
            })

        console.log(JSON.stringify(resultsArray))

        return {
            title: resultsArray[0].choice.title,
            sentiment: resultsArray[0].choice.sentiment,
            summary: resultsArray
                .map(r => r.choice.summary)
                .join(' '),
            main_points: resultsArray
                .map(r => r.choice.main_points)
                .flat(),
            action_items: resultsArray
                .map(r => r.choice.action_items)
                .flat(),
            stories: resultsArray
                .map(r => r.choice.stories)
                .flat(),
            arguments: resultsArray
                .map(r => r.choice.arguments)
                .flat(),
            follow_up: resultsArray
                .map(r => r.choice.follow_up)
                .flat(),
            related_topics: resultsArray
                .map(r => r.choice.related_topics)
                .flat()
                .map(item => item.toLowerCase()),
            tokens: resultsArray
                .map(r => r.usage)
                .reduce((acc, curr) => acc + curr, 0)
        }
    },
})