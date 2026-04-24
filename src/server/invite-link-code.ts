import crypto from "node:crypto";

const ALPH = "abcdefghijklmnopqrstuvwxyz0123456789";
/* Shorter path = less wrapping in chat bubbles */
const CODE_LEN = 8;

function randomCode(): string {
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (b) => ALPH[b % 36]!)
    .join("")
    .slice(0, CODE_LEN);
}

export { CODE_LEN, randomCode };
