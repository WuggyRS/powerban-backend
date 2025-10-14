import 'dotenv/config';
import knex from "../db/knexDb.js";
import { v4 as uuidv4 } from "uuid";
import walletService from "../service/walletService.js";

async function completeDraw(drawId: string) {
  const winningNumbers = generateWinningNumbers();
  console.log(`Winning numbers: ${JSON.stringify(winningNumbers)}`);

  await knex.transaction(async (trx) => {
    const draw = await trx("draws")
      .where({ id: drawId })
      .forUpdate()
      .first();
    
    console.log(draw);

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

    const winners = allTickets.filter(t => countMatches(t.numbers as number[], winningNumbers) === 5);
    const match4 = allTickets.filter(t => countMatches(t.numbers as number[], winningNumbers) === 4);
    const match3 = allTickets.filter(t => countMatches(t.numbers as number[], winningNumbers) === 3);
    const match2 = allTickets.filter(t => countMatches(t.numbers as number[], winningNumbers) === 2);

    console.log(`Match5 (jackpot) winners: ${winners.length}`);
    console.log(`Match4 winners: ${match4.length}`);
    console.log(`Match3 winners: ${match3.length}`);
    console.log(`Match2 winners: ${match2.length}`);

    const prizeLevels = [
      { name: "winner", tickets: winners, amount: jackpotAmount },
      { name: "match4", tickets: match4, amount: 1000 },
      { name: "match3", tickets: match3, amount: 500 },
      { name: "match2", tickets: match2, amount: 100 },
    ];

    let winnerRows: any[] = [];

    console.log(`Claiming operator funds`);
    await walletService.claimPendingBan(operatorIndex);

    for (const level of prizeLevels) {
      if (level.tickets.length === 0 || level.amount <= 0) {
        console.log(`Level ${level.name} had no winners, skipping`);
        continue;
      }

      const prizePerWinnerBAN = Number((level.amount / level.tickets.length).toFixed(6));
      const prizePerWinnerRaw =
        (BigInt(Math.round(prizePerWinnerBAN * 1e6)) * 10n ** 23n).toString();

      console.log(`${level.name}: Each winner gets ${prizePerWinnerBAN} BAN`);

      for (const ticket of level.tickets) {
        const winnerWallet = ticket.win_address;

        if (!winnerWallet) {
          console.warn(`No wallet for player ${ticket.player_id}`);
          continue;
        }

        try {
          const payoutTxHash = await walletService.sendBan(
            String(operatorIndex),
            winnerWallet,
            String(prizePerWinnerBAN),
          );

          console.log(`Paid ${winnerWallet} ${prizePerWinnerBAN} BAN, tx hash: ${payoutTxHash}`);

          winnerRows.push({
            id: uuidv4(),
            ticket_id: ticket.id,
            draw_id: drawId,
            prize_amount_raw: prizePerWinnerRaw,
            payout_tx_hash: payoutTxHash,
            prize_tier: level.name,
            created_at: new Date(),
          });
        } catch (err) {
          console.log(`Error while trying to pay out winner`, err);
        }
      }
    }

    if (winnerRows.length > 0) {
      await trx("winners").insert(winnerRows);
    }

    await trx("draws")
      .where({ id: drawId })
      .update({
        status: "completed",
        completed_at: new Date(),
        winning_numbers: winningNumbers,
        winners: winners.length,
        match4: match4.length,
        match3: match3.length,
        match2: match2.length,
      });
  });

  return winningNumbers;
}

function countMatches(ticketNums: number[], winNums: number[]) {
  return ticketNums.filter((n) => winNums.includes(n)).length;
}

function generateWinningNumbers(): number[] {
  const nums: number[] = [];
  while (nums.length < 5) {
    const n = Math.floor(Math.random() * 35) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a, b) => a - b);
}

// 10/13 draw
completeDraw("ecf65ea7-4406-43ad-92e3-8e79eac891a1");
