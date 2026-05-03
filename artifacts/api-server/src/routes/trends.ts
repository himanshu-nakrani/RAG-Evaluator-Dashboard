import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { experimentsTable, evalRunsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/experiments/:id/trends", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [exp] = await db
      .select()
      .from(experimentsTable)
      .where(eq(experimentsTable.id, id));

    if (!exp) {
      res.status(404).json({ error: "Experiment not found" });
      return;
    }

    const runs = await db
      .select()
      .from(evalRunsTable)
      .where(eq(evalRunsTable.experimentId, id))
      .orderBy(desc(evalRunsTable.createdAt));

    const trends = runs
      .map((r, i) => ({
        runNumber: runs.length - i,
        faithfulness: r.avgFaithfulness,
        contextRecall: r.avgContextRecall,
        latencyMs: r.avgLatencyMs,
        createdAt: r.createdAt,
      }))
      .reverse();

    // Detect regressions (>5% drop in metrics)
    const regressions: any[] = [];
    for (let i = 1; i < trends.length; i++) {
      const prev = trends[i - 1];
      const curr = trends[i];

      if (prev.faithfulness && curr.faithfulness) {
        const percentChange = ((curr.faithfulness - prev.faithfulness) / prev.faithfulness) * 100;
        if (percentChange < -5) {
          regressions.push({
            runNumber: curr.runNumber,
            metric: "faithfulness",
            previousValue: prev.faithfulness,
            currentValue: curr.faithfulness,
            percentChange: Math.round(percentChange * 100) / 100,
            severity: percentChange < -15 ? "high" : "medium",
          });
        }
      }

      if (prev.contextRecall && curr.contextRecall) {
        const percentChange =
          ((curr.contextRecall - prev.contextRecall) / prev.contextRecall) * 100;
        if (percentChange < -5) {
          regressions.push({
            runNumber: curr.runNumber,
            metric: "contextRecall",
            previousValue: prev.contextRecall,
            currentValue: curr.contextRecall,
            percentChange: Math.round(percentChange * 100) / 100,
            severity: percentChange < -15 ? "high" : "medium",
          });
        }
      }
    }

    res.json({
      experimentId: exp.id,
      experimentName: exp.name,
      trends,
      regressions,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get experiment trends");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
