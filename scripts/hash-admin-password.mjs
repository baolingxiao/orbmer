import { createPasswordHash } from "../server/admin-auth.js";

async function readHiddenPassword() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    return "";
  }
  process.stdout.write("Admin password: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  let value = "";
  return new Promise((resolve) => {
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      resolve(value);
    };
    const onData = (character) => {
      if (character === "\u0003") {
        process.stdout.write("\n");
        process.exit(130);
      }
      if (character === "\r" || character === "\n") {
        finish();
        return;
      }
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (character >= " ") value += character;
    };
    process.stdin.on("data", onData);
  });
}

const password = process.argv[2] || (await readHiddenPassword());
if (!password) {
  console.error("Run this command in an interactive terminal.");
  process.exit(1);
}

try {
  console.log(createPasswordHash(password));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
