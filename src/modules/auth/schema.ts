import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const magicLinkSchema = z.object({
  email: z.string().email(),
});
