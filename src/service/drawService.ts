import knex from "../db/knexDb.js";
import { v4 as uuidv4 } from "uuid";
import walletService from "./walletService.js";

class DrawService {
  public async getOrCreateTodayDraw() {
    let draw = await knex("draws")
      .whereRaw("draw_date = (now() AT TIME ZONE 'America/Chicago')::date")
      .first();

    if (!draw) {
      [draw] = await knex("draws")
        .insert({
          id: uuidv4(),
          draw_date: knex.raw("(now() AT TIME ZONE 'America/Chicago')::date"),
          status: "scheduled",
        })
        .returning("*");
    }

    return draw;
  }

  public async completeDraw(drawId: string) {
    const winningNumbers = this.generateWinningNumbers();
    const nowCT = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const drawDate = new Date(nowCT).toISOString().slice(0, 10);
    const tomorrowDate = new Date(new Date(drawDate).getTime() + 24*10*60*1000)
                          .toISOString().slice(0, 10);

    console.log(`Winning numbers: ${JSON.stringify(winningNumbers)}`);

    await knex.transaction(async (trx) => {
      const draw = await trx("draws")
        .where({ id: drawId })
        .forUpdate()
        .first();

      const jackpotAmount = draw.jackpot || 1000;
      const operatorIndex = 0;

      if (!draw) {
        throw new Error(`Draw ${drawId} not found`);
      }
      if (draw.status === "completed") {
        throw new Error(`Draw ${drawId} is already completed`);
      }

      const allTickets = await trx("tickets")
        .where({ draw_id: drawId });

      const winners = allTickets.filter((ticket) => {
        const nums = ticket.numbers as number[];
        return (
          nums.length === winningNumbers.length &&
          nums.every((n, idx) => n === winningNumbers[idx])
        );
      });
      console.log(`Winning tickets: ${winners.length}`);

      let winnerRows: any[] = [];

      if (winners.length > 0) {
        const prizePerWinnerBAN = Number((jackpotAmount / winners.length).toFixed(6));
        const prizePerWinnerRaw =
          (BigInt(Math.round(prizePerWinnerBAN * 1e6)) * 10n ** 23n).toString();

        console.log(`Each winner gets ${prizePerWinnerBAN} BAN`);

        console.log(`Claiming operator funds`);
        await walletService.claimPendingBan(operatorIndex);

        for (const ticket of winners) {
          const winnerWallet = ticket.win_address;
          if (!winnerWallet) {
            console.warn(`No wallet found for player ${ticket.player_id}`);
            continue;
          }

          const payoutTxHash = await walletService.sendBan(
            String(operatorIndex),
            winnerWallet,
            String(prizePerWinnerBAN),
          );
          console.log(`Paid ${winnerWallet} ${prizePerWinnerBAN} BAN, tx hash: ${payoutTxHash}`)

          winnerRows.push({
            id: uuidv4(),
            ticket_id: ticket.id,
            draw_id: drawId,
            prize_amount_raw: prizePerWinnerRaw,
            payout_tx_hash: payoutTxHash,
            created_at: new Date(),
          });
        }

        if (winnerRows.length > 0) {
          await trx("winners").insert(winnerRows);
        }
      }

      await trx("draws")
        .where({ id: drawId })
        .update({
          status: "completed",
          completed_at: new Date(),
          winning_numbers: winningNumbers,
          winners: winners.length,
        });

      // TODO: Roll over the ticket sales into the next jackpot
      // const { address: operatorAddress } = await walletService.deriveBanAddress(operatorIndex);
      // const nextJackpotAmount = await walletService.getBanBalance(operatorAddress);

      const nextJackpotAmount = winners.length === 0 ? jackpotAmount : 2500;

      console.log(`Next jackpot amount: ${nextJackpotAmount} BAN`);

      await trx("draws")
        .insert({
          id: uuidv4(),
          draw_date: tomorrowDate,
          status: "scheduled",
          jackpot: nextJackpotAmount,
          created_at: new Date(),
        });
    });

    return winningNumbers;
  }

  public async getTodayDraw() {
    return await knex("draws")
      .whereRaw("draw_date = (now() AT TIME ZONE 'America/Chicago')::date")
      .andWhereNot("status", "completed")
      .first();
  }

  public async getPreviousDraw() {
    return await knex("draws")
      .where("status", "completed")
      .orderBy("draw_date", "desc")
      .first();
  }

  public async getTicketCount(drawId: string): Promise<number> {
    const result = await knex("tickets")
      .where({ draw_id: drawId })
      .count<{ count: string }>("id as count")
      .first();

    return result ? parseInt(result.count, 10) : 0;
  }

  // Simple algorithm for now, will replace this with transaction hash based number generation
  private generateWinningNumbers(): number[] {
    const nums: number[] = [];
    while (nums.length < 5) {
      const n = Math.floor(Math.random() * 35) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    return nums.sort((a, b) => a - b);
  }
}

const drawService = new DrawService();
export default drawService;
