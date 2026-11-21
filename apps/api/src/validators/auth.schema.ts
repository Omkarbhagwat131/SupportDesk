import { z } from "zod";

const passwordSchema = z.string().min(12).refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
  message: "Password must not exceed 72 UTF-8 bytes.",
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: passwordSchema,
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1).refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "Password must not exceed 72 UTF-8 bytes.",
  }),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: passwordSchema,
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
