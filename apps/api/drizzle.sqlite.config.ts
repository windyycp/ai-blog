import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.sqlite.ts',
  out: './drizzle/sqlite',
  dbCredentials: {
    url: process.env.SQLITE_PATH ?? '../../data/blog.db',
  },
  verbose: true,
  strict: false,
})
