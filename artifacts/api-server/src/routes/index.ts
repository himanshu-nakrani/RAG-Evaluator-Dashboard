import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import questionSetsRouter from "./question-sets";
import experimentsRouter from "./experiments";
import evalRunsRouter from "./eval-runs";
import dashboardRouter from "./dashboard";
import leaderboardRouter from "./leaderboard";
import sweepsRouter from "./sweeps";
import comparisonRouter from "./comparison";
import trendsRouter from "./trends";
import templatesRouter from "./templates";
import humanRatingsRouter from "./human-ratings";
import presetsRouter from "./presets";
import challengeRouter from "./challenge";
import arenaRouter from "./arena";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(questionSetsRouter);
router.use(comparisonRouter);
router.use(trendsRouter);
router.use(experimentsRouter);
router.use(evalRunsRouter);
router.use(dashboardRouter);
router.use(leaderboardRouter);
router.use(sweepsRouter);
router.use(templatesRouter);
router.use(humanRatingsRouter);
router.use(presetsRouter);
router.use(challengeRouter);
router.use(arenaRouter);

export default router;
