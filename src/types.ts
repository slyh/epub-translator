interface Progress {
  ["Progress"]: string,
  ["Tokens Used"]: string,
};

interface TranslateOptions {
  model?: string,
  type?: string,
};

export {
  Progress,
  TranslateOptions
};