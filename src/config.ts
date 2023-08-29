import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";

const config = {
  OPENAI_API_KEY: "",
  REMOVE_RUBY_ANNOTATION: true,
  SIDE_BY_SIDE_MODE: false,
  PROMPTS: {
    TEXT: "Translate the provided passage from a Japanese light novel into English. Maintain the original literary style.",
    HTML: "Translate the provided passage from a Japanese light novel into English. Maintain the original literary style and keep HTML tags intact.",
    PASSTHROUGH: "Translate the provided passage from a Japanese light novel into English. Maintain the original literary style and keep HTML tags intact.",
    SENTENCE: "Translate the provided sentence from a Japanese light novel into English. Maintain the original literary style.",
    SENTENCE_HTML: "Translate the provided sentence from a Japanese light novel into English. Maintain the original literary style and keep HTML tags intact."
  },
  load
};

async function load(filePath = path.join(process.cwd(), "./config.json")) {
  let loadedConfig: unknown;
  let warning = false;

  try {
    const jsonString = fs.readFileSync(filePath, { encoding: "utf8" });

    loadedConfig = JSON.parse(jsonString);
    if (typeof loadedConfig !== "object" || !loadedConfig) {
      throw new Error("Failed to parse the config file.");
    }
  } catch (err) {
    console.log("\x1b[31m[ERROR]\x1b[0m Failed to read the config file.\n");
    throw err;
  }


  if (!("OPENAI_API_KEY" in loadedConfig) || typeof loadedConfig.OPENAI_API_KEY !== "string" || !loadedConfig.OPENAI_API_KEY) {
    console.log("\x1b[33m[WARNING]\x1b[0m Config: Invalid OpenAI API key.");
    warning = true;
  } else {
    config.OPENAI_API_KEY = loadedConfig.OPENAI_API_KEY;
  }

  if (!("PROMPTS" in loadedConfig) || typeof loadedConfig.PROMPTS !== "object" || !loadedConfig.PROMPTS) {
    console.log("\x1b[33m[WARNING]\x1b[0m Config: PROMPTS not found.");
    warning = true;
  } else {
    if (!("TEXT" in loadedConfig.PROMPTS) || typeof loadedConfig.PROMPTS.TEXT !== "string" || !loadedConfig.PROMPTS.TEXT) {
      console.log("\x1b[33m[WARNING]\x1b[0m Config: Invalid PROMPTS.TEXT.");
      warning = true;
    } else {
      config.PROMPTS.TEXT = loadedConfig.PROMPTS.TEXT;
    }
    if (!("HTML" in loadedConfig.PROMPTS) || typeof loadedConfig.PROMPTS.HTML !== "string" || !loadedConfig.PROMPTS.HTML) {
      console.log("\x1b[33m[WARNING]\x1b[0m Config: Invalid PROMPTS.HTML.");
      warning = true;
    } else {
      config.PROMPTS.HTML = loadedConfig.PROMPTS.HTML;
    }
    if (!("PASSTHROUGH" in loadedConfig.PROMPTS) || typeof loadedConfig.PROMPTS.PASSTHROUGH !== "string" || !loadedConfig.PROMPTS.PASSTHROUGH) {
      console.log("\x1b[33m[WARNING]\x1b[0m Config: Invalid PROMPTS.PASSTHROUGH.");
      warning = true;
    } else {
      config.PROMPTS.PASSTHROUGH = loadedConfig.PROMPTS.PASSTHROUGH;
    }
    if (!("SENTENCE" in loadedConfig.PROMPTS) || typeof loadedConfig.PROMPTS.SENTENCE !== "string" || !loadedConfig.PROMPTS.SENTENCE) {
      console.log("\x1b[33m[WARNING]\x1b[0m Config: Invalid PROMPTS.SENTENCE.");
      warning = true;
    } else {
      config.PROMPTS.SENTENCE = loadedConfig.PROMPTS.SENTENCE;
    }
    if (!("SENTENCE_HTML" in loadedConfig.PROMPTS) || typeof loadedConfig.PROMPTS.SENTENCE_HTML !== "string" || !loadedConfig.PROMPTS.SENTENCE_HTML) {
      console.log("\x1b[33m[WARNING]\x1b[0m Config: Invalid PROMPTS.SENTENCE_HTML.");
      warning = true;
    } else {
      config.PROMPTS.SENTENCE_HTML = loadedConfig.PROMPTS.SENTENCE_HTML;
    }
  }

  if (warning) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("Continue? (Y/n): ");

    if (`${answer}`.toLowerCase() != "y") {
      process.exit(0);
    }

    console.log("");
    rl.close();
  }
}

export default config;