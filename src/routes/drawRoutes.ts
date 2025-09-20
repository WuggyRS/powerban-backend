import { Router } from "express";
import { nextDraw, previousDraw, todayDraw } from "../controllers/drawController.js";

const router = Router();

router.get("/today", todayDraw);
router.get("/previous", previousDraw);
router.get("/next-draw", nextDraw);

export default router;
