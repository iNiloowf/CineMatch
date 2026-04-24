import crypto from "node:crypto";

const ALPH = "abcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LEN = 10;

function randomCode(): string {
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (b) => ALPH[b % 36]!)
    .join("")
    .slice(0, CODE_LEN);
}

export { CODE_LEN, randomCode };
