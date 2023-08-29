import config from "./config";
import openai from "./openai";
import processor from "./processor";
import { Progress, TranslateOptions } from "./types";

const translators: Translators = {
  ["gpt-3.5-turbo"]: openai.translate,
  ["gpt-3.5-turbo-0613"]: openai.translate,
  ["gpt-4"]: openai.translate,
  ["gpt-4-0314"]: openai.translate,
  ["gpt-4-0613"]: openai.translate,
};

type Translators = Record<string, (input: string, options: TranslateOptions) => Promise<{ translated: string, promptTokens: number, completionTokens: number, totalTokens: number }>>;

async function html(htmlString: string, model = "gpt-3.5-turbo", inputLimit = 1024, progress: Progress | undefined) {
  if (!(model in translators)) {
    throw new Error(`Unknown model: ${model}`);
  }

  const chunks = processor.split(htmlString);

  let title = "Title";
  if (chunks.length > 0) {
    title = chunks[0].data;
  }

  let input = "";
  let inputType = processor.contentTypes.text; // Default to text prompt
  let result = `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">\n` +
    `  <head>\n` +
    `    <meta charset="UTF-8"/>\n` +
    `    <title>${title}</title>\n` +
    `  </head>\n` +
    `  <body>\n`;

  let promptTokensUsed = 0;
  let completionTokensUsed = 0;
  let totalTokensUsed = 0;

  // First chunk is used for the title
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const nextChunk = i + 1 < chunks.length ? chunks[i + 1] : null;

    if (chunk.type == processor.contentTypes.bypass) {
      result += "    " + chunk.data + "\n\n";
    } else if (chunk.data.length > 0) {
      input += chunk.data + "\n\n";
      if (chunk.type == processor.contentTypes.html) {
        inputType = chunk.type;
      } else if (chunk.type == processor.contentTypes.passthrough) {
        inputType = chunk.type;
      }
    }

    if (
      inputType == processor.contentTypes.passthrough ||
      nextChunk === null ||
      nextChunk.type == processor.contentTypes.bypass ||
      nextChunk.type == processor.contentTypes.passthrough ||
      (input.length + nextChunk.data.length) > inputLimit
    ) {
      input = input.trim();

      // Use the prompt for a sentence if a newline character is not found
      if (!input.includes("\n")) {
        if (inputType == processor.contentTypes.html) {
          inputType = processor.contentTypes.sentenceHtml;
        }
        if (inputType == processor.contentTypes.text) {
          inputType = processor.contentTypes.sentence;
        }
      }

      const { translated, promptTokens, completionTokens, totalTokens } = await translators[model](input, { model, type: inputType });

      if (inputType == processor.contentTypes.passthrough) {
        result += translated + "\n";
      } else {
        const inputLines = input.split("\n").filter(e => e.trim().length > 0);
        const translatedLines = translated.split("\n").filter(e => e.trim().length > 0);

        for (let i = 0; i < Math.max(inputLines.length, translatedLines.length); i++) {
          if (config.SIDE_BY_SIDE_MODE && i < inputLines.length) {
            result += `    <p>${inputLines[i]}</p>\n`;
          }
          if (i < translatedLines.length) {
            result += `    <p>${translatedLines[i]}</p>\n`;
          }
        }
      }

      promptTokensUsed += promptTokens;
      completionTokensUsed += completionTokens;
      totalTokensUsed += totalTokens;

      input = "";
      inputType = processor.contentTypes.text;

      if (progress) {
        progress["Progress"] = `${i} / ${chunks.length}`;
        progress["Tokens Used"] = `${promptTokensUsed} / ${completionTokensUsed} / ${totalTokensUsed}`;
      }
    }
  }

  result += "  </body>\n</html>";

  if (progress) {
    progress["Progress"] = "Finished";
    progress["Tokens Used"] = `${promptTokensUsed} / ${completionTokensUsed} / ${totalTokensUsed}`;
  }

  return { result, promptTokensUsed, completionTokensUsed, totalTokensUsed };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function opf(input: string, model = "gpt-3.5-turbo", inputLimit = 1024, progress: Progress | undefined) {
  if (!(model in translators)) {
    throw new Error(`Unknown model: ${model}`);
  }

  const texts = [...input.matchAll(/<\s*dc:title[^>]*>(.*)<\s*\/\s*dc:title\s*>/gm)];

  let promptTokensUsed = 0;
  let completionTokensUsed = 0;
  let totalTokensUsed = 0;

  let result = input;

  for (let i = 0; i < texts.length; i++) {
    const original = texts[i][1];

    const { translated, promptTokens, completionTokens, totalTokens } = await translators[model](original, { model, type: processor.contentTypes.sentence });

    promptTokensUsed += promptTokens;
    completionTokensUsed += completionTokens;
    totalTokensUsed += totalTokens;

    result = result.replaceAll(original, translated);

    if (progress) {
      progress["Progress"] = `${i} / ${texts.length}`;
      progress["Tokens Used"] = `${promptTokensUsed} / ${completionTokensUsed} / ${totalTokensUsed}`;
    }
  }

  if (progress) {
    progress["Progress"] = "Finished";
    progress["Tokens Used"] = `${promptTokensUsed} / ${completionTokensUsed} / ${totalTokensUsed}`;
  }

  return { result, promptTokensUsed, completionTokensUsed, totalTokensUsed };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function ncx(input: string, model = "gpt-3.5-turbo", inputLimit = 1024, progress: Progress | undefined) {
  if (!(model in translators)) {
    throw new Error(`Unknown model: ${model}`);
  }

  const texts = [...input.matchAll(/<\s*text[^>]*>(.*)<\s*\/\s*text\s*>/gm)];

  let promptTokensUsed = 0;
  let completionTokensUsed = 0;
  let totalTokensUsed = 0;

  let result = input;

  for (let i = 0; i < texts.length; i++) {
    const original = texts[i][1];

    const { translated, promptTokens, completionTokens, totalTokens } = await translators[model](original, { model, type: processor.contentTypes.sentence });

    promptTokensUsed += promptTokens;
    completionTokensUsed += completionTokens;
    totalTokensUsed += totalTokens;

    result = result.replaceAll(original, translated);

    if (progress) {
      progress["Progress"] = `${i} / ${texts.length}`;
      progress["Tokens Used"] = `${promptTokensUsed} / ${completionTokensUsed} / ${totalTokensUsed}`;
    }
  }

  if (progress) {
    progress["Progress"] = "Finished";
    progress["Tokens Used"] = `${promptTokensUsed} / ${completionTokensUsed} / ${totalTokensUsed}`;
  }

  return { result, promptTokensUsed, completionTokensUsed, totalTokensUsed };
}

async function txt(input: string, model = "gpt-3.5-turbo", inputLimit = 1024, progress: Progress | undefined) {
  if (!(model in translators)) {
    throw new Error(`Unknown model: ${model}`);
  }

  const texts = input.split("\n");

  let promptTokensUsed = 0;
  let completionTokensUsed = 0;
  let totalTokensUsed = 0;

  let chunk = "";
  let result = "";

  for (let i = 0; i < texts.length; i++) {
    const line = texts[i].trim();
    const nextLine = i + 1 < texts.length ? texts[i + 1] : null;

    if (line.length > 0) {
      chunk += line + "\n\n";
    }

    if (nextLine === null || (chunk.length + nextLine.length) > inputLimit) {
      chunk = chunk.trim();

      // Use the prompt for a sentence if a newline character is not found
      let inputType = processor.contentTypes.text;
      if (!chunk.includes("\n")) {
        inputType = processor.contentTypes.sentence;
      }

      const { translated, promptTokens, completionTokens, totalTokens } = await translators[model](chunk, { model, type: inputType });

      const inputLines = chunk.split("\n").filter(e => e.trim().length > 0);
      const translatedLines = translated.split("\n").filter(e => e.trim().length > 0);

      for (let i = 0; i < Math.max(inputLines.length, translatedLines.length); i++) {
        if (config.SIDE_BY_SIDE_MODE && i < inputLines.length) {
          result += `${inputLines[i]}\n\n`;
        }
        if (i < translatedLines.length) {
          result += `${translatedLines[i]}\n\n`;
        }
      }

      promptTokensUsed += promptTokens;
      completionTokensUsed += completionTokens;
      totalTokensUsed += totalTokens;

      chunk = "";

      if (progress) {
        progress["Progress"] = `${i} / ${texts.length}`;
        progress["Tokens Used"] = `${promptTokensUsed} / ${completionTokensUsed} / ${totalTokensUsed}`;
      }
    }
  }

  if (progress) {
    progress["Progress"] = "Finished";
    progress["Tokens Used"] = `${promptTokensUsed} / ${completionTokensUsed} / ${totalTokensUsed}`;
  }

  return { result, promptTokensUsed, completionTokensUsed, totalTokensUsed };
}

export default {
  html,
  opf,
  ncx,
  txt,
  translators,
};