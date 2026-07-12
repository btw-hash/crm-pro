import { redirect } from "next/navigation";
import { canUseManagerAssistant, type Role } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { AssistantChat } from "./_components/assistant-chat";

/**
 * AI assistant: questions about the CRM in natural language. The answer is built on a
 * deterministic snapshot of the CRM (numbers are computed by code, the AI only finds and
 * formats them — a project rule). Access — head of sales and manager
 * (canUseManagerAssistant); the title and scope are captioned by role: head of sales —
 * the whole department, manager — their own portfolio.
 */
const ASSISTANT_HEADER: Partial<Record<Role, { title: string; subtitle: string }>> = {
  head: {
    title: "Head of sales AI assistant",
    subtitle: "Answers over department data › ERP + deterministic calculations",
  },
  mop: {
    title: "Sales assistant AI",
    subtitle: "Answers over your clients and processes › ERP + deterministic calculations",
  },
};

export default async function AssistantPage() {
  const user = await requireUser();
  if (!canUseManagerAssistant(user.role)) {
    redirect("/");
  }
  const header = ASSISTANT_HEADER[user.role] ?? ASSISTANT_HEADER.head!;
  return (
    <div style={{ fontFamily: "Arial" }}>
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            font: "700 28px/1 Arial",
            letterSpacing: "-.5px",
            color: "#16181d",
            margin: 0,
          }}
        >
          {header.title}
        </h1>
        <p
          style={{
            font: "400 13px Arial",
            color: "#9a9ea8",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          {header.subtitle}
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
