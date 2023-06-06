# AI Audio Notes

Repo housing code used in a [Pipedream](https://pipedream.com/) pipeline that integrates:

- Google Drive
- OpenAI transcription API
- OpenAI chat API
- Notion

Based on a tutorial found here:
https://thomasjfrank.com/how-to-transcribe-audio-to-text-with-chatgpt-and-notion/#tutorial-overview

Code refactored heavily, and intent slightly tweaked.

If following the tutorial, here are some callouts:

- This follows the "code-heavy" path
- I omit the last step in the tutorial in favor of just having one step that integrates with the notion API.
- Here are the names of all my pipeline steps to avoid any confusion of step naming:
  - trigger
  - download_to_tmp
  - get_duration
  - create_transcription
  - openai_chat
  - format_chat
  - make_paragraphs
  - notion
- If there is custom code I have written, it will be named the same as the step above in this repo.

## Future plans

Ideally would have integrated with the Pipedream AI to automatically deploy changes made to the code in this repo, but they seem to have an issue with API key generation currently.