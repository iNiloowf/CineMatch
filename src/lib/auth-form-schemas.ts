import { z } from "zod";
import { isValidPublicHandleFormat, normalizePublicHandleInput } from "@/lib/public-handle";

/** Login / existing accounts — keep lenient for users who signed up before stricter signup rules. */
export const MIN_AUTH_PASSWORD_LEN = 6;

/** At least one ASCII punctuation / symbol (signup only). */
export const SIGNUP_PASSWORD_SPECIAL_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/;

/** New accounts: longer password + special character (see signup form copy). */
export const MIN_SIGNUP_PASSWORD_LEN = 8;

export const signupPasswordFieldSchema = z
  .string()
  .min(1, "Choose a password.")
  .min(MIN_SIGNUP_PASSWORD_LEN, `Use at least ${MIN_SIGNUP_PASSWORD_LEN} characters.`)
  .regex(
    SIGNUP_PASSWORD_SPECIAL_REGEX,
    "Include at least one special character (e.g. ! @ # $ %).",
  );

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(MIN_AUTH_PASSWORD_LEN, `Use at least ${MIN_AUTH_PASSWORD_LEN} characters.`),
});

export const signupPublicHandleFieldSchema = z
  .string()
  .trim()
  .min(1, "Choose a User ID.")
  .transform((v) => normalizePublicHandleInput(v))
  .refine((v) => isValidPublicHandleFormat(v), {
    message:
      "User ID: 3–32 characters, start with a letter, use letters, numbers, or underscores only.",
  });

export const signupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .min(2, "Use at least 2 characters for your name."),
  publicHandle: signupPublicHandleFieldSchema,
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .email("Enter a valid email address."),
  password: signupPasswordFieldSchema,
  acceptedLegal: z.boolean().refine((value) => value === true, {
    message: "You must agree to the Terms of Service and Privacy Policy to create an account.",
  }),
});
