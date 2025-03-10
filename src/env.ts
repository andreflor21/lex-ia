import { z } from 'zod'

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3333),
  // Database
  DATABASE_URL: z.string(),
  // URLs
  API_URL: z.string().url(),
  WEB_URL: z.string().url(),
  OPENAI_API_KEY: z.string(),
  OPENAI_ASSISTANT_ID: z.string(),
})

export const env = envSchema.parse(process.env)
