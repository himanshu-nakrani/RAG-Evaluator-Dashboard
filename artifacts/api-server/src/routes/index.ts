import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import questionSetsRouter from "./question-sets";
import experimentsRouter from "./experiments";
import evalRunsRouter from "./eval-runs";
import dashboardRouter from "./dashboard";
import leaderboardRouter from "./leaderboard";
import sweepsRouter from "./sweeps";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(questionSetsRouter);
router.use(experimentsRouter);
router.use(evalRunsRouter);
router.use(dashboardRouter);
router.use(leaderboardRouter);
router.use(sweepsRouter);

export default router;
