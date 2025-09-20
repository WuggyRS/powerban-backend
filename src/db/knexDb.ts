import Knex from "knex";
import config from "../config/knexConfig.js";
import pg from 'pg';

pg.types.setTypeParser(pg.types.builtins.DATE, val => val);

const environment = process.env.NODE_ENVIRONMENT || "dev";
const knex = Knex(config[environment]);

export default knex;
