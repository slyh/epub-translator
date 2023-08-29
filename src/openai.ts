import OpenAI from "openai";

import logger from "./logger";
import processor from "./processor";
import { TranslateOptions } from "./types";
import utils from "./utils";

let prompts: Prompts;

let openai: OpenAI | null = null;

type Prompts = Record<string, string>;

interface ApiOptions {
  model: string,
  prompt: string | null,
};

function init(apiKey: string, configPrompts: Prompts) {
  openai = new OpenAI({
    apiKey: apiKey,
  });
  prompts = configPrompts;
}

async function translate(input: string, options: TranslateOptions = {}) {
  const apiOptions = {
    model: "gpt-4",
    prompt: prompts[processor.contentTypes.html]
  };

  if (options.model) {
    apiOptions.model = options.model;
  }

  if (options.type) {
    apiOptions.prompt = prompts[options.type];
  }

  return await translateApi(input, apiOptions);
}

async function translateApi(input: string, options: ApiOptions) {
  if (!openai) {
    throw new Error("OpenAI API uninitialised.");
  }

  const inputString = input.trim();

  let translated = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let retryCount = 0;

  const sleepTime = 60;

  if (inputString.length == 0) {
    return { translated, promptTokens, completionTokens, totalTokens };
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    try {
      const request = {
        model: options.model,
        messages: [
          {
            "role": "system" as const,
            "content": options.prompt
          },
          {
            "role": "user" as const,
            "content": inputString
          }
        ],
        temperature: 0.2,
        // max_tokens: 16384,
        top_p: 0.8,
        frequency_penalty: 0,
        presence_penalty: 0,
      };

      const response = await openai.chat.completions.create(request);

      logger.write(`Request:\n${JSON.stringify(request)}\n\nResponse:\n${JSON.stringify(response)}\n\n`);

      if (response.choices.length > 0) {
        translated = response.choices[0].message.content ?? translated;
      }

      if (response.usage) {
        promptTokens = response.usage.prompt_tokens;
        completionTokens = response.usage.completion_tokens;
        totalTokens = response.usage.total_tokens;
      }

      return { translated, promptTokens, completionTokens, totalTokens };
    } catch (err: unknown) {
      retryCount++;
      console.log(`\x1b[31m[ERROR]\x1b[0m Error in calling OpenAI API, retrying in ${retryCount * sleepTime} seconds.`, err instanceof Error && err.message);
    }

    await utils.sleep(retryCount * sleepTime * 1000);
  }
}

export default {
  init,
  translate
};