import knex from "../db/knexDb.js";
import walletService from "./walletService.js";
import { v4 as uuidv4 } from "uuid";

class PlayerService {
  constructor() {}

  public async createPlayer(): Promise<string> {
    const [player] = await knex("players")
      .insert({ id: uuidv4() })
      .returning("*");

    return player.id;
  }

  public async getPlayerWallet(userId: string) {
    const wallet = await knex("wallets").where({ player_id: userId }).first();
    return wallet;
  }

  public async getOrCreateDepositAddress(userId: string) {
    const wallet = await this.getPlayerWallet(userId);

    if (!wallet) {
      const [newWallet] = await knex("wallets")
        .insert({
          id: uuidv4(),
          player_id: userId,
          ban_address: "ban_placeholder_address",
        })
        .returning("*");

      const { address } = await walletService.deriveBanAddress(newWallet.account_index);
      await knex("wallets").where({ id: newWallet.id }).update({ ban_address: address });

      return { depositAddress: address };
    }

    return { depositAddress: wallet.ban_address };
  }
}

const playerService = new PlayerService();
export default playerService;
