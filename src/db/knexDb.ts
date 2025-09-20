import Knex from "knex";
import config from "../config/knexConfig.js";

const environment = process.env.NODE_ENVIRONMENT || "dev";
const knex = Knex(config[environment]);

export default knex;
