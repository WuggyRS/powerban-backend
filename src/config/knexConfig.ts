import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  dev: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: +(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "123456",
      database: process.env.DB_NAME || "powerban",
    },
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
  },

  prod: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "powerban",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
  },
};

export default config;
