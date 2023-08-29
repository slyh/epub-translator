class ConcurrencyLimit {
  limit: number;
  runningInstances: number;

  constructor(limit: number) {
    this.limit = limit;
    this.runningInstances = 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async run<T extends any[], U>(fn: (...args: T) => Promise<U>, ...args: T) {
    while (this.runningInstances >= this.limit) {
      await sleep(1000);
    }
    let result: U;
    this.runningInstances++;
    try {
      result = await fn(...args);
    } catch (err) {
      throw err;
    } finally {
      this.runningInstances--;
    }
    return result;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  ConcurrencyLimit,
  sleep
};