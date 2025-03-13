import { z } from 'zod'
import * as dotenv from 'dotenv'
dotenv.config()
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
  // env
  NODE_ENV: z.enum(['dev', 'production']).default('dev'),
  // ssl certs
  HTTPS_CERT: z.string().optional(),
  HTTPS_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)
