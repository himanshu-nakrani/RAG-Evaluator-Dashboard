import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import questionSetsRouter from "./question-sets";
import experimentsRouter from "./experiments";
import evalRunsRouter from "./eval-runs";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(questionSetsRouter);
router.use(experimentsRouter);
router.use(evalRunsRouter);
router.use(dashboardRouter);

export default router;
