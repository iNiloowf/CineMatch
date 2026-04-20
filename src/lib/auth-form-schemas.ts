import { z } from "zod";

export const MIN_AUTH_PASSWORD_LEN = 6;

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

export const signupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .min(2, "Use at least 2 characters for your name."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(1, "Choose a password.")
    .min(MIN_AUTH_PASSWORD_LEN, `Use at least ${MIN_AUTH_PASSWORD_LEN} characters.`),
  acceptedLegal: z.boolean().refine((value) => value === true, {
    message: "You must agree to the Terms of Service and Privacy Policy to create an account.",
  }),
});
