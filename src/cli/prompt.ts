import readline from "node:readline/promises";
import { Writable } from "node:stream";

export interface Prompter {
  /** True when answers can be requested from a human on a terminal. */
  readonly interactive: boolean;
  ask(question: string, options?: { hidden?: boolean }): Promise<string>;
}

export function createTerminalPrompter(
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WriteStream = process.stderr,
): Prompter {
  return {
    interactive: Boolean(input.isTTY),
    async ask(question, { hidden = false } = {}) {
      let muted = false;
      // Echo goes through this stream so hidden answers are never printed.
      const echo = new Writable({
        write(chunk, encoding, callback) {
          if (!muted) {
            output.write(chunk, encoding);
          }
          callback();
        },
      });
      const rl = readline.createInterface({ input, output: echo, terminal: true });

      try {
        output.write(question);
        muted = hidden;
        const answer = await rl.question("");
        return answer.trim();
      } finally {
        muted = false;
        rl.close();
        if (hidden) {
          output.write("\n");
        }
      }
    },
  };
}
