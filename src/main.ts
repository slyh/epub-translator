import fs from "node:fs";
import path from "node:path";

import readline from "node:readline/promises";
import process from "node:process";

import blacklist from "./blacklist";
import config from "./config";
import openai from "./openai";
import translator from "./translator";
import { Progress } from "./types";
import utils from "./utils";

const inputDir = "./input/";
const outputDir = "./output/";

// How many files should be handled at the same time.
// Mainly to avoid hammering the API.
const concurrencyLimit = 16;

const models = Object.keys(translator.translators);

const formats: Formats = {
  [".xhtml"]: { type: "HTML", func: translator.html },
  [".html"]: { type: "HTML", func: translator.html },
  [".ncx"]: { type: "NCX", func: translator.ncx },
  [".opf"]: { type: "OPF", func: translator.opf },
  [".txt"]: { type: "TXT", func: translator.txt },
};

type ProgressList = Record<string, Progress>;

type Formats = Record<string, {
  type: string,
  func: (htmlString: string, model: string, inputLimit: number, progress: Progress | undefined) => Promise<{ result: string, promptTokensUsed: number, completionTokensUsed: number, totalTokensUsed: number }>
}>;

async function main() {
  await config.load();

  openai.init(config.OPENAI_API_KEY, config.PROMPTS);

  const fileList = fs.readdirSync(path.join(process.cwd(), inputDir), { encoding: "utf8" });

  // No recursive support before node 20
  for (const fileName of fileList) {
    const filePath = path.join(process.cwd(), inputDir, fileName);

    if (fs.lstatSync(filePath).isDirectory()) {
      fileList.push(...fs.readdirSync(filePath, { encoding: "utf8" }).map(e => path.join(fileName, e)));
    }
  }

  const fileTable = [];

  for (const fileName of fileList) {
    const file = {
      ["Name"]: fileName,
      ["Type"]: "",
    };

    const inputFilePath = path.join(process.cwd(), inputDir, fileName);
    const outputFilePath = path.join(process.cwd(), outputDir, fileName);

    if (fs.lstatSync(inputFilePath).isDirectory()) {
      continue;
    }

    if (fs.existsSync(outputFilePath)) {
      file["Type"] = "Skip (Output file already exists)";
    } else if (blacklist.file(fileName)) {
      file["Type"] = "Copy as is (File name blacklisted)";
    } else if (path.extname(fileName).toLowerCase() in formats) {
      file["Type"] = formats[path.extname(fileName).toLowerCase()].type;
    } else {
      file["Type"] = "Copy as is (Unsupported format)";
    }

    fileTable.push(file);
  }

  console.log("\x1b[1mFiles waiting to be processed:\x1b[0m");
  console.table(fileTable);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const answerContinue = await rl.question("Continue? (Y/n): ");
  if (`${answerContinue}`.toLowerCase() != "y") {
    rl.close();
    return;
  }

  const sideBySideMode = await rl.question(`\nEnable side by side mode? (Y/n) (Default: no): `);
  if (`${sideBySideMode}`.toLowerCase() == "y") {
    config.SIDE_BY_SIDE_MODE = true;
  } else {
    config.SIDE_BY_SIDE_MODE = false;
  }
  console.log(`\n\x1b[34m[NOTICE]\x1b[0m Side by side mode ${config.SIDE_BY_SIDE_MODE ? "enabled" : "disabled"}.\n`);

  const removeRubyAnnotation = await rl.question(`Remove ruby annotations? (Y/n) (Default: yes): `);
  if (`${removeRubyAnnotation}`.toLowerCase() == "n") {
    config.REMOVE_RUBY_ANNOTATION = false;
  } else {
    config.REMOVE_RUBY_ANNOTATION = true;
  }
  console.log(`\n\x1b[34m[NOTICE]\x1b[0m Ruby annotations will ${config.REMOVE_RUBY_ANNOTATION ? "" : "not "}be removed.\n`);

  let model = await rl.question(`Which model should be used? (Default: ${models[0]}): `);
  if (!models.includes(model)) {
    model = models[0];
  }
  console.log(`\n\x1b[34m[NOTICE]\x1b[0m Using model: ${model}\n`);

  const inputLimitAnswer = await rl.question(`How long should a prompt be? (Default: 1024): `);
  let inputLimit = parseInt(inputLimitAnswer);
  if (isNaN(inputLimit) || inputLimit <= 0) {
    inputLimit = 1024;
  }
  console.log(`\n\x1b[34m[NOTICE]\x1b[0m Prompt character limit: ${inputLimit}\n`);

  rl.close();

  let totalPromptTokensUsed = 0;
  let totalCompletionTokensUsed = 0;
  let totalTotalTokensUsed = 0;

  const progress: ProgressList = {};

  const interval = setInterval(printProgress, 10 * 1000, progress);

  console.log("\x1b[34m[NOTICE]\x1b[0m Started processing. Progress will be printed every 10 seconds.\n");

  const cl = new utils.ConcurrencyLimit(concurrencyLimit);

  const processFn = async (fileName: string) => {
    const inputFilePath = path.join(process.cwd(), inputDir, fileName);
    const outputFilePath = path.join(process.cwd(), outputDir, fileName);

    if (fs.lstatSync(inputFilePath).isDirectory()) {
      return;
    }

    if (fs.existsSync(outputFilePath)) {
      return;
    }

    progress[fileName] = {
      ["Progress"]: "Working",
      ["Tokens Used"]: "0"
    };

    const input = fs.readFileSync(inputFilePath, { encoding: "utf8" });
    let output = "";

    let promptTokensUsed = 0;
    let completionTokensUsed = 0;
    let totalTokensUsed = 0;

    if (!blacklist.file(fileName)) {
      if (path.extname(fileName).toLowerCase() in formats) {
        ({ result: output, promptTokensUsed, completionTokensUsed, totalTokensUsed } = await formats[path.extname(fileName).toLowerCase()].func(input, model, inputLimit, progress[fileName]));
      }
    }

    totalPromptTokensUsed += promptTokensUsed;
    totalCompletionTokensUsed += completionTokensUsed;
    totalTotalTokensUsed += totalTokensUsed;

    // Blacklisted or unsupported format
    if (output.length == 0) {
      fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
      fs.copyFileSync(inputFilePath, outputFilePath);

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete progress[fileName];

      console.log(`\x1b[34m[NOTICE]\x1b[0m Copied ${fileName} without processing.`);
    } else {
      fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
      fs.writeFileSync(outputFilePath, output);
    }
  };

  const promises = fileList.map((fileName) => cl.run(processFn, fileName));

  await Promise.all(promises);

  clearInterval(interval);

  printProgress(progress);

  console.log(`\x1b[1mModel:\x1b[0m ${model}`);
  console.log(`\x1b[1mTokens Used:\x1b[0m ${totalPromptTokensUsed} input / ${totalCompletionTokensUsed} output / ${totalTotalTokensUsed} total`);
}

function printProgress(progress: ProgressList) {
  if (Object.keys(progress).length > 0) {
    console.log("\n\x1b[1mProgress:\x1b[0m");
    console.table(progress);
  }
}

void main();