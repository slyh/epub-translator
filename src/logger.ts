import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const logDir = "./log/";

const currentDate = new Date();
const filePath = path.join(process.cwd(), logDir, currentDate.toISOString().replaceAll(/[:.]/gm, "-") + ".txt");

function write(input: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, input);
}

export default {
  write
};