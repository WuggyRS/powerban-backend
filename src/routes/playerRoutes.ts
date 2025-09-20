import { Router } from "express";
import { depositAddress, createPlayer, purchaseTickets, getTodayTicketsForPlayer } from "../controllers/playerController.js";

const router = Router();

router.get("/", createPlayer);
router.post("/deposit-address", depositAddress);
router.post("/tickets/purchase", purchaseTickets);
router.get("/:userId/tickets", getTodayTicketsForPlayer);

export default router;
