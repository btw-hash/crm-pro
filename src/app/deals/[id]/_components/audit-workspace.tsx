import type { SectionVisibility } from "@/domain/deal/deal-stage";
import type { TechRequest } from "@/domain/tech-request/tech-request";
import {
  TECH_REQUEST_KIND_LABELS,
  TECH_REQUEST_STATUS_LABELS,
} from "@/domain/tech-request/tech-request";
import { TechRequestForm } from "./tech-request-form";

/**
 * Workspace for the "Tech request" stage (stage key: audit).
 * Active stage — form to pick the request type and send it to the technologist (#460).
 * Passed stage — read-only list of sent requests.
 */
export function AuditWorkspace({
  dealId,
  clientId,
  dealTitle,
  dealTechRequests,
  visibility,
}: {
  dealId: string;
  clientId: string;
  dealTitle: string;
  dealTechRequests: TechRequest[];
  visibility: SectionVisibility;
}) {
  if (visibility === "readonly") {
    if (dealTechRequests.length === 0) {
      return <p className="muted">No tech requests have been sent.</p>;
    }
    return (
      <ul className="timeline">
        {dealTechRequests.map((req) => (
          <li key={req.id} className="timeline__item">
            <span className="badge">{TECH_REQUEST_STATUS_LABELS[req.status]}</span>
            <div className="timeline__body">
              <p>
                {TECH_REQUEST_KIND_LABELS[req.kind]}: {req.note}
              </p>
              {req.deadline ? <p className="muted">Deadline: {req.deadline}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <p
        style={{
          font: "400 13px/1.5 Arial",
          color: "#6b6f78",
          marginBottom: 14,
        }}
      >
        Submit a request to the technologist — choose a type, fill in the details, and send it for
        review. Once confirmed, the process will move on to the technologist&apos;s response.
      </p>
      <TechRequestForm dealId={dealId} clientId={clientId} dealTitle={dealTitle} />
    </div>
  );
}
