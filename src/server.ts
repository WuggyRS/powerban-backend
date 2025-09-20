import 'dotenv/config';
import express, { Request, Response, NextFunction } from "express";
import playerRoutes from "./routes/playerRoutes.js";
import drawRoutes from "./routes/drawRoutes.js";
import cors from "cors";
import nodeCron from 'node-cron';
import drawService from './service/drawService.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.use("/player", playerRoutes);
app.use("/draw", drawRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

const schedule =
  process.env.DRAW_TEST_MODE === "true"
  ? "*/10 * * * *" // Every 10 minutes
  : "59 23 * * *"; // 11:59 PM every day

nodeCron.schedule(schedule, async () => {
  try {
    const now = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    console.log(`[${now}] Running daily draw completion`);

    const draw = await drawService.getOrCreateTodayDraw();
    await drawService.completeDraw(draw.id);

    console.log(`Draw ${draw.id} completed successfully`);
  } catch (err) {
    console.error("Error completing draw:", err);
  }
}, { timezone: "America/Chicago" });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
