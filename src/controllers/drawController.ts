import { Request, Response } from "express";
import drawService from "../service/drawService.js";

export async function nextDraw(req: Request, res: Response) {
  const now = new Date();

  if (process.env.DRAW_TEST_MODE === "true") {
    const ms = now.getTime();
    const next10 = Math.ceil(ms / (10 * 60 * 1000)) * (10 * 60 * 1000);
    res.json({ nextDraw: new Date(next10).toISOString() });
  } else {
    const nowCT = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const ctDate = new Date(nowCT);
    const nextDrawCT = new Date(ctDate);
    nextDrawCT.setHours(23, 59, 0, 0);
    if (ctDate > nextDrawCT) {
      // If it's already past 11:59 CT, use tomorrow
      nextDrawCT.setDate(nextDrawCT.getDate() + 1);
    }
    res.json({ nextDraw: nextDrawCT.toISOString() });
  }
}

export async function previousDraw(req: Request, res: Response) {
  const draw = await drawService.getPreviousDraw();

  if (!draw) {
    res.status(404).json({ success: false });
    return;
  }

  res.json({
    success: true,
    drawDate: draw.draw_date,
    winningNumbers: draw.winning_numbers,
    jackpot: draw.jackpot,
    winners: draw.winners,
  });
}

export async function todayDraw(req: Request, res: Response) {
  const draw = await drawService.getTodayDraw();

  if (!draw) {
    res.status(404).json({ success: false });
    return;
  }

  res.json({
    success: true,
    drawDate: draw.draw_date,
    jackpot: draw.jackpot,
  });
}
