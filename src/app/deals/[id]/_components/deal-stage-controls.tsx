"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  canRevert,
  canTransition,
  FUNNEL_TRACK,
  isTerminal,
  type DealStage,
} from "@/domain/deal/deal-stage";
import { advanceStageAction, revertStageAction } from "@/app/deals/actions";

/**
 * Advances a deal along its track right from the card (not only from the board). Exactly
 * three actions: step forward to the next stage of the track, revert to the previous one,
 * and jump to additional info. Directions are computed from FUNNEL_TRACK and gated by
 * canTransition/canRevert. `todo` is a soft hint when the current stage's action isn't done
 * yet (it doesn't block — the decision is left to the human).
 */
export function DealStageControls({
  dealId,
  stage,
  todo,
}: {
  dealId: string;
  stage: DealStage;
  todo: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    start(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Couldn't change the stage.");
      else router.refresh();
    });
  };

  const advance = (to: DealStage) => run(() => advanceStageAction({ dealId, to }));
  const revert = (to: DealStage) => run(() => revertStageAction({ dealId, toStage: to }));

  const curIdx = FUNNEL_TRACK.indexOf(stage);
  const nextStage = curIdx >= 0 ? FUNNEL_TRACK[curIdx + 1] : undefined;
  const prevStage = curIdx > 0 ? FUNNEL_TRACK[curIdx - 1] : undefined;

  // "Forward" button — to the next stage of the track, if the transition is allowed and the stage isn't final.
  const canGoForward =
    !isTerminal(stage) && nextStage !== undefined && canTransition(stage, nextStage);
  // "Back" button — to the previous stage of the track (hidden on the first stage).
  const canGoBack = prevStage !== undefined && canRevert(stage, prevStage);

  return (
    <div>
      {/*
        Design reference (CRM-PRO.dc.html, "stage actions" block, lines 329-334): only three
        stage buttons here. The stage track with circles is already shown above by a
        separate stepper (StageStepper), so the duplicate text list of stages
        (<ol className="stage-track__steps">) was removed.
      */}
      {/* Soft hint about an unfinished current-stage action — doesn't block, decision is left to the human. */}
      {todo ? (
        <p
          style={{
            margin: "0 0 12px",
            color: "#9a6a00",
            background: "rgba(227,179,43,0.12)",
            border: "1px solid rgba(227,179,43,0.35)",
            borderRadius: 12,
            padding: "9px 13px",
            font: "400 13px Arial",
            lineHeight: 1.45,
          }}
        >
          {todo}
        </p>
      ) : null}

      {/*
        The action-panel border/spacing (marginTop/paddingTop/borderTop) is drawn ONCE by
        the outer wrapper in page.tsx. Here we only do the flex layout of the three stage
        buttons, without a duplicate border-top, otherwise there'd be a double line/gap.
      */}
      <div
        style={{
          display: "flex",
          gap: 9,
          flexWrap: "wrap",
        }}
      >
        {canGoForward && nextStage ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => advance(nextStage)}
            style={{
              border: "none",
              background: "#1c1f27",
              color: "#fff",
              font: "600 13px Arial",
              padding: "10px 17px",
              borderRadius: 999,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            Move to next stage
          </button>
        ) : null}

        {canGoBack && prevStage ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => revert(prevStage)}
            style={{
              border: "1px solid rgba(120,130,150,0.32)",
              background: "rgba(255,255,255,0.7)",
              color: "#16181d",
              font: "600 13px Arial",
              padding: "10px 16px",
              borderRadius: 999,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Move back
          </button>
        ) : null}

        <Link
          href={`/deals/${dealId}/prepare`}
          style={{
            border: "1px solid rgba(255,255,255,0.6)",
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#16181d",
            font: "600 13px Arial",
            padding: "10px 16px",
            borderRadius: 999,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
            <path d="M9 12h6M9 16h6" />
          </svg>
          Additional info
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
