epub-translator is a tool that translates EPUB files using large language models. It attempts to convert HTML codes into plain text, which is then sent to a LLM for translation.

!["Kusamakura" by Natsume Sōseki, translated into English with gpt-3.5-turbo. Licensed under CC-BY-SA 3.0.](https://github.com/slyh/epub-translator/assets/80482978/1396be84-d53f-4f26-a0d3-7b8d672853de)

["Kusamakura" by Natsume Sōseki](https://github.com/IDPF/epub3-samples/releases/download/20230704/kusamakura-japanese-vertical-writing.epub), translated into English with `gpt-3.5-turbo`. Licensed under [CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).

## Getting Started

1. Populate `config.json` with your API key and modify the prompts to suit your needs.

2. Unzip an EPUB file into `input` folder.

3. Run the executable or run from source.

```
npm install
npm run start
```

4. Follow the on-screen instructions.

5. The translated files should appear in `output` folder.

## Config

| Key                   | Type   | Description                                                      |
|-----------------------|--------|------------------------------------------------------------------|
| OPENAI_API_KEY        | string | OpenAI API key.                                                  |
| PROMPTS.TEXT          | string | Prompt for translating paragraphs that are free of HTML tags.    |
| PROMPTS.HTML          | string | Prompt for translating paragraphs that are mixed with HTML tags. |
| PROMPTS.PASSTHROUGH   | string | Prompt for translating raw HTML codes with no pre-processing.    |
| PROMPTS.SENTENCE      | string | Prompt for translating a sentence that is free of HTML tags.     |
| PROMPTS.SENTENCE_HTML | string | Prompt for translating a sentence that is mixed with HTML tags.  |

## Options

### Side by Side Mode

Default: `No`

Display the original and translated text side by side. This is simply a naive line printer that prints the original line first and the translated line second. As the translation result might have a different number of lines, the lines may get out of order. You might want to try lowering the prompt character limit if you want it to be strictly in order.

### Remove Ruby Annotations

Default: `Yes`

Remove `<ruby>` and `<rt>` tags in the source material before sending it for translation. This might affect the quality of the translation.

### Model

Default: `gpt-3.5-turbo`

Possible values: `gpt-3.5-turbo`, `gpt-3.5-turbo-0613`, `gpt-4`, `gpt-4-0314` or `gpt-4-0613`

Recommended: `gpt-3.5-turbo` or `gpt-4-0314`

`gpt-3.5-turbo` offers reasonable translation quality at a low cost. `gpt-4-0314` provides better translation quality and overall behaves better, especially in handling texts with HTML codes. `gpt-4` and `gpt-4-0613` are not recommended as their translation results are somehow worse than the older GPT-4 model.

### Prompt Character Limit

Default: `1024`

NOTE: This limit is enforced in terms of the number of characters, not tokens. As a rule of thumb, you might presume that every Japanese character equals 1 to 1.2 tokens and that every 750 English words equal 1000 tokens.

This setting limits how many characters will be accumulated before being sent to the LLM API for translation. Different models have different token limits, and these limits are shared between input and output. Therefore, even though GPT-4 offers 8k token support, you should not attempt to fill the prompt to its full capacity. Otherwise, there will be no space left for providing a response. Although it might be expected that a longer prompt provides better results, it seems that GPT loses focus when processing long messages and tends to repeat itself. This setting might not be respected if the source material contains HTML blocks that cannot be split.

## To Do

* Write tests
* Parse `<nav>` element
