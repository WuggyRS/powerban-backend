import { Request, Response } from "express";
import playerService from "../service/playerService.js";
import ticketService from "../service/ticketService.js";

export async function createPlayer(req: Request, res: Response) {
  try {
    const userId = await playerService.createPlayer();
    res.json({ userId });
  } catch (error: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function depositAddress(req: Request, res: Response) {
  try {
    const userId = req.body?.userId;
    if (!userId) {
      res.status(400).json({ error: "User ID is invalid" });
      return;
    }

    const result = await playerService.getOrCreateDepositAddress(userId);
    res.json({
      depositAddress: result.depositAddress,
    });
  } catch (error: any) {
    console.error("Error in depositAddress:", error);
    if (error.message.includes("Wallet not found")) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}

// TODO: This should really be fronted by a message queue...
export async function purchaseTickets(req: Request, res: Response) {
  const { userId, tickets, winAddress } = req.body;

  if (!userId) {
    res.status(400).json({ error: "User ID is invalid" });
    return;
  }

  if (!winAddress) {
    res.status(400).json({ error: "Win address is invalid" });
    return;
  }

  if (
    !Array.isArray(tickets) ||
    tickets.length === 0 ||
    tickets.some(
      (ticket) =>
        !Array.isArray(ticket) ||
        ticket.length !== 5 ||
        ticket.some((n) => typeof n !== "number")
    )
  ) {
    res.status(400)
      .json({ error: "Tickets must be a non-empty with exactly 5 numbers each" });
    return;
  }

  try {
    await ticketService.processTicketPurchase(userId, tickets, winAddress);
    res.json({ message: "Successfully purchased tickets", tickets });
  } catch (error: any) {
    console.log("Error in purchaseTickets:", error);

    if (error.message.includes("Insufficient balance")) {
      res.status(402).json({ error: error.message }); // 402 Payment Required
      return;
    }

    if (error.message.includes("not found") || error.message.includes("already purchased")) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function getTodayTicketsForPlayer(req: Request, res: Response) {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ error: "User ID is invalid" });
    return;
  }

  try {
    const tickets = await ticketService.getTodayTickets(userId);
    res.json({ message: "Success", tickets });
  } catch (error: any) {
    console.log("Error in getTodayTicketsForPlayer:", error);

    res.status(500).json({ error: "Internal Server Error" });
  }
}
