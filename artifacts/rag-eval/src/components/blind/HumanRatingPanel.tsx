import { useListHumanRatings, useCreateHumanRating } from "@workspace/api-client-react";
import { Star } from "lucide-react";

interface HumanRatingPanelProps {
  evalRunId: number;
  questionId?: number;
  label: string;
}

export function HumanRatingPanel({ evalRunId, questionId = 0, label }: HumanRatingPanelProps) {
  const { data: ratings } = useListHumanRatings(
    { evalRunId },
    { query: { queryKey: ["listHumanRatings", evalRunId], enabled: !!evalRunId } },
  );
  const createRating = useCreateHumanRating();

  const currentRating = (ratings ?? []).find(
    (r) => r.evalRunId === evalRunId && r.questionId === questionId,
  )?.rating ?? null;

  const handleRate = (rating: number) => {
    createRating.mutate({
      data: { evalRunId, questionId, rating },
    });
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleRate(n)}
            disabled={createRating.isPending}
            className={`p-1.5 rounded transition-colors ${
              currentRating !== null && n <= currentRating
                ? "text-yellow-500 hover:text-yellow-400"
                : "text-muted-foreground/40 hover:text-yellow-500/60"
            }`}
            aria-label={`Rate ${n} out of 5`}
          >
            <Star
              className="w-5 h-5"
              fill={currentRating !== null && n <= currentRating ? "currentColor" : "none"}
            />
          </button>
        ))}
        {currentRating !== null && (
          <span className="text-xs text-muted-foreground ml-2">{currentRating}/5</span>
        )}
      </div>
    </div>
  );
}
