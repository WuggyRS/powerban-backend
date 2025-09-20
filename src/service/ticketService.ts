import knex from "../db/knexDb.js";
import drawService from "./drawService.js";
import playerService from "./playerService.js";
import walletService from "./walletService.js";
import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";

class TicketService {
  constructor() {}

  public async processTicketPurchase(userId: string, tickets: number[][], winAddress: string) {
    const wallet = await playerService.getPlayerWallet(userId);
    const accountIndex = Number(wallet.account_index);

    const draw = await drawService.getOrCreateTodayDraw();
    const drawId = draw.id;
    console.log(`Draw ID: ${drawId}`);

    // Claim all pending transactions
    console.log(`Claiming pending BAN for account ${accountIndex}`);
    await walletService.claimPendingBan(accountIndex);

    // Check if there's enough balance to buy the tickets
    const balance = await walletService.getBanBalance(wallet.ban_address);
    console.log(`Balance for account ${accountIndex}: ${balance} BAN`);

    const ticketPrice = 10; // 10 BAN
    const totalCost = ticketPrice * tickets.length;

    if (balance < totalCost) {
      throw new Error("Insufficient balance to purchase all tickets");
    }

    // Check if you already have purchased one of the tickets
    const duplicatesExist = await knex("tickets")
      .where({ player_id: userId, draw_id: drawId })
      .where(function () {
        tickets.forEach(nums => {
          const pgArray = `{${nums.join(",")}}`;
          this.orWhereRaw("numbers = ?::integer[]", [pgArray]);
        });
      })
      .first();

    if (duplicatesExist) {
      throw new Error("You have already purchased one or more of these tickets");
    }

    // Transfer the funds to the operator wallet
    console.log(`Transferring funds to operator account`);
    const operatorWalletIndex = 0;
    const operatorAccount = await walletService.deriveBanAddress(operatorWalletIndex);
    const purchaseTxHash = await walletService.sendBan(String(accountIndex), operatorAccount.address, String(totalCost));
    console.log(`Operator account tx hash: ${purchaseTxHash}`);

    // Receive the payment on the operator account
    console.log(`Claiming funds on operator account`);
    await walletService.claimPendingBan(operatorWalletIndex);

    // Buy the tickets
    const insertRows = tickets.map((numbers) => ({
      id: uuidv4(),
      player_id: userId,
      draw_id: drawId,
      numbers,
      purchase_tx_hash: purchaseTxHash,
      win_address: winAddress,
      created_at: new Date(),
    }));

    await knex("tickets").insert(insertRows);

    console.log(`Bought ${tickets.length} tickets`);
  }

  public async getTodayTickets(userId: string) {
    const nowCT = DateTime.now().setZone("America/Chicago");
    const fromCT = nowCT.startOf("day").toISO(); // 00:00:00 CT
    const toCT   = nowCT.set({ hour: 23, minute: 59, second: 0, millisecond: 0 }).toISO(); // 23:59:00 CT

    const tickets = await knex("tickets")
      .where("player_id", userId)
      .andWhere("created_at", ">=", fromCT)
      .andWhere("created_at", "<=", toCT)
      .orderBy("created_at", "asc");

      return tickets.map((ticket) => ticket.numbers);
  }
}

const ticketService = new TicketService();
export default ticketService;
