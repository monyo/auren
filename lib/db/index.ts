import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// 用於 query（connection pool）
const queryClient = postgres(connectionString)
export const db = drizzle(queryClient, { schema })

// 用於 drizzle-kit migration（single connection）
export const migrationClient = postgres(connectionString, { max: 1 })
