import { parseFile } from 'music-metadata';
import { inspect } from 'util';

export default defineComponent({
    async run({ steps, $ }) {
        const filePath = `/tmp/recording.${steps.trigger.event.fullFileExtension}`
        const dataPack = await parseFile(filePath)
        const duration = await inspect(dataPack.format.duration, { showHidden: false, depth: null })
        return Math.round(duration)
    },
})