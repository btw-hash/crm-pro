import "server-only";

import type { AiGateway } from "@/application/ports/ai-gateway";
import type { Notifier } from "@/application/ports/notifier";
import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { SpeechToText } from "@/application/ports/speech-to-text";
import {
  type AdvanceDealStage,
  makeAdvanceDealStage,
} from "@/application/use-cases/advance-deal-stage";
import {
  makeRevertDealStage,
  type RevertDealStage,
} from "@/application/use-cases/revert-deal-stage";
import { makeSetDealOutcome, type SetDealOutcome } from "@/application/use-cases/set-deal-outcome";
import { type CompleteTask, makeCompleteTask } from "@/application/use-cases/complete-task";
import {
  type CountUnreadNotifications,
  makeCountUnreadNotifications,
} from "@/application/use-cases/count-unread-notifications";
import {
  type ListNotifications,
  makeListNotifications,
} from "@/application/use-cases/list-notifications";
import {
  makeMarkNotificationRead,
  type MarkNotificationRead,
} from "@/application/use-cases/mark-notification-read";
import {
  type BuildProposalDraft,
  makeBuildProposalDraft,
} from "@/application/use-cases/build-proposal-draft";
import {
  type DraftActFromVoice,
  makeDraftActFromVoice,
} from "@/application/use-cases/draft-act-from-voice";
import {
  type DraftActivityFromVoice,
  makeDraftActivityFromVoice,
} from "@/application/use-cases/draft-activity-from-voice";
import { type GetClientCard, makeGetClientCard } from "@/application/use-cases/get-client-card";
import {
  type GetClientBalanceView,
  makeGetClientBalanceView,
} from "@/application/use-cases/get-client-balance-view";
import {
  type FileReturnClaim,
  makeFileReturnClaim,
} from "@/application/use-cases/file-return-claim";
import {
  type ListClientReturns,
  makeListClientReturns,
} from "@/application/use-cases/list-client-returns";
import {
  type GetDispatchPlan,
  makeGetDispatchPlan,
} from "@/application/use-cases/get-dispatch-plan";
import {
  type AdvanceShipmentUseCase,
  makeAdvanceShipment,
} from "@/application/use-cases/advance-shipment";
import {
  type ListMyShipments,
  makeListMyShipments,
} from "@/application/use-cases/list-my-shipments";
import {
  type CancelMyShipment,
  makeCancelMyShipment,
} from "@/application/use-cases/cancel-my-shipment";
import {
  type ListLoadingShipments,
  type AdvanceLoadingShipment,
  makeListLoadingShipments,
  makeAdvanceLoadingShipment,
} from "@/application/use-cases/list-loading-shipments";
import {
  type ListAccountingShipments,
  type AdvanceAccountingShipment,
  makeListAccountingShipments,
  makeAdvanceAccountingShipment,
} from "@/application/use-cases/list-accounting-shipments";
import {
  type AdvancePackingRequest,
  type FilePackingRequest,
  type ListPackingRequests,
  makeAdvancePackingRequest,
  makeFilePackingRequest,
  makeListPackingRequests,
} from "@/application/use-cases/packing-requests";
import {
  type AdvanceDefectItem,
  type FileDefectItem,
  type ListDefectItems,
  makeAdvanceDefectItem,
  makeFileDefectItem,
  makeListDefectItems,
} from "@/application/use-cases/defect-items";
import {
  type ListOnboardings,
  makeApproveOnboarding,
  makeListOnboardings,
  makeRejectOnboarding,
  makeSetOnboardingDoc,
  makeStartOnboarding,
  makeSubmitOnboarding,
  type OnboardingTransition,
  type SetOnboardingDoc,
  type StartOnboarding,
} from "@/application/use-cases/onboardings";
import {
  makeAdvanceReturnClaim,
  makeRejectReturnClaim,
  type ProgressReturnClaim,
} from "@/application/use-cases/progress-return-claim";
import {
  type GetFunnelAnalytics,
  makeGetFunnelAnalytics,
} from "@/application/use-cases/get-funnel-analytics";
import {
  type GetSalesAnalytics,
  makeGetSalesAnalytics,
} from "@/application/use-cases/get-sales-analytics";
import {
  type GetCustomerProductMatrix,
  makeGetCustomerProductMatrix,
} from "@/application/use-cases/get-customer-product-matrix";
import {
  type GetProductRecommendations,
  makeGetProductRecommendations,
} from "@/application/use-cases/get-product-recommendations";
import {
  type GetAssortmentAnalysis,
  makeGetAssortmentAnalysis,
} from "@/application/use-cases/get-assortment-analysis";
import {
  type GetProcurementAnalysis,
  makeGetProcurementAnalysis,
} from "@/application/use-cases/get-procurement-analysis";
import {
  type GetAssortmentPromotions,
  makeGetAssortmentPromotions,
} from "@/application/use-cases/get-assortment-promotions";
import {
  type GetHomeDashboard,
  makeGetHomeDashboard,
} from "@/application/use-cases/get-home-dashboard";
import { type GetMyOpenTasks, makeGetMyOpenTasks } from "@/application/use-cases/get-my-open-tasks";
import { type Authenticate, makeAuthenticate } from "@/application/use-cases/authenticate";
import { type Login, makeLogin } from "@/application/use-cases/login";
import { type Logout, makeLogout } from "@/application/use-cases/logout";
import {
  type GetDealWorkspace,
  makeGetDealWorkspace,
} from "@/application/use-cases/get-deal-workspace";
import {
  type ListActivitiesByClient,
  makeListActivitiesByClient,
} from "@/application/use-cases/list-activities-by-client";
import { type ListClients, makeListClients } from "@/application/use-cases/list-clients";
import { type ListDeals, makeListDeals } from "@/application/use-cases/list-deals";
import {
  type ListDealsWithStatus,
  makeListDealsWithStatus,
} from "@/application/use-cases/list-deals-with-status";
import { type ListProducts, makeListProducts } from "@/application/use-cases/list-products";
import {
  type SyncNomenclature,
  makeSyncNomenclature,
} from "@/application/use-cases/sync-nomenclature";
import {
  type ListProductsWithStock,
  makeListProductsWithStock,
} from "@/application/use-cases/list-products-with-stock";
import { makeRecordActivity, type RecordActivity } from "@/application/use-cases/record-activity";
import { makeRecordTestAct, type RecordTestAct } from "@/application/use-cases/record-test-act";
import { makeSendTestAct, type SendTestAct } from "@/application/use-cases/send-test-act";
import { makeRequestSample, type RequestSample } from "@/application/use-cases/request-sample";
import { makeCreateShipment, type CreateShipment } from "@/application/use-cases/create-shipment";
import {
  makePlaceCustomerOrder,
  type PlaceCustomerOrder,
} from "@/application/use-cases/place-customer-order";
import {
  type AskManagerAssistant,
  makeAskManagerAssistant,
} from "@/application/use-cases/ask-manager-assistant";
import {
  type GetAssistantConversation,
  type ListAssistantConversations,
  type RecordAssistantExchange,
  type SearchAssistantConversations,
  makeGetAssistantConversation,
  makeListAssistantConversations,
  makeRecordAssistantExchange,
  makeSearchAssistantConversations,
} from "@/application/use-cases/assistant-conversations";
import {
  makeSuggestNextStep,
  type SuggestNextStep,
} from "@/application/use-cases/suggest-next-step";
import {
  type DraftClientMessage,
  makeDraftClientMessage,
} from "@/application/use-cases/draft-client-message";
import { makeSetDealGoal, type SetDealGoal } from "@/application/use-cases/set-deal-goal";
import { makeCreateDeal, type CreateDeal } from "@/application/use-cases/create-deal";
import { makeCreateClient, type CreateClient } from "@/application/use-cases/create-client";
import { makeUpdateClient, type UpdateClient } from "@/application/use-cases/update-client";
import {
  makeLaunchSkuQualification,
  type LaunchSkuQualification,
} from "@/application/use-cases/launch-sku-qualification";
import { makeUpdateDeal, type UpdateDeal } from "@/application/use-cases/update-deal";
import { makeDeleteDeal, type DeleteDeal } from "@/application/use-cases/delete-deal";
import {
  makeAssignDealManager,
  type AssignDealManager,
} from "@/application/use-cases/assign-deal-manager";
import {
  makeSaveProductionAudit,
  type SaveProductionAudit,
} from "@/application/use-cases/save-production-audit";
import {
  makeUpdateProductionAudit,
  type UpdateProductionAudit,
} from "@/application/use-cases/update-production-audit";
import {
  makeGetDealQualification,
  type GetDealQualificationUseCase,
} from "@/application/use-cases/get-deal-qualification";
import {
  makeSaveDealQualification,
  type SaveDealQualificationUseCase,
} from "@/application/use-cases/save-deal-qualification";
import { makeSaveProposal, type SaveProposalUseCase } from "@/application/use-cases/save-proposal";
import { makeGetProposal, type GetProposalUseCase } from "@/application/use-cases/get-proposal";
import {
  makeUpdateSampleRequest,
  type UpdateSampleRequest,
} from "@/application/use-cases/update-sample-request";
import {
  makeCreateTechRequest,
  type CreateTechRequest,
} from "@/application/use-cases/create-tech-request";
import {
  makeTakeTechRequest,
  type TakeTechRequest,
} from "@/application/use-cases/take-tech-request";
import {
  makeCompleteTechRequest,
  type CompleteTechRequest,
} from "@/application/use-cases/complete-tech-request";
import {
  makeListOpenTechRequests,
  type ListOpenTechRequests,
  makeListAllTechRequests,
  type ListAllTechRequests,
} from "@/application/use-cases/list-tech-requests";
import { makeListQuotas, type ListQuotas } from "@/application/use-cases/list-quotas";
import {
  makeReserveFromQuota,
  type ReserveFromQuota,
} from "@/application/use-cases/reserve-from-quota";
import {
  makeAllocateDeficit,
  type AllocateDeficit,
} from "@/application/use-cases/allocate-deficit";
import {
  type CreateAdditionalOrderUseCase,
  type ListAdditionalOrdersByDate,
  type ListAdditionalOrdersByParent,
  makeCreateAdditionalOrder,
  makeListAdditionalOrdersByDate,
  makeListAdditionalOrdersByParent,
} from "@/application/use-cases/additional-order";
import { InMemoryAdditionalOrderRepository } from "./persistence/in-memory-additional-order-repository";
import { InMemoryQuotaRepository } from "./persistence/in-memory-quota-repository";
import { InMemoryProductDescriptionRepository } from "./persistence/in-memory-product-description-repository";
import { InMemoryAssistantConversationRepository } from "./persistence/in-memory-assistant-conversation-repository";
import { PrismaAssistantConversationRepository } from "./persistence/prisma-assistant-conversation-repository";
import {
  type GenerateProductDescriptions,
  type ListProductDescriptions,
  makeGenerateProductDescriptions,
  makeListProductDescriptions,
} from "@/application/use-cases/product-descriptions";
import { assertProviderCompliant } from "./ai/global-llm-guard";
import { LlmAiGateway } from "./ai/llm-ai-gateway";
import { AnthropicLlmProvider } from "./ai/llm/anthropic-llm-provider";
import type { LlmProvider } from "./ai/llm/llm-provider";
import { OpenAiLlmProvider } from "./ai/llm/openai-llm-provider";
import { OpenRouterLlmProvider } from "./ai/llm/openrouter-llm-provider";
import { BudgetCappedAiGateway } from "./ai/budget-capped-ai-gateway";
import { PseudonymizingLlmProvider } from "./ai/pseudonymizing-llm-provider";
import { AsyncLocalStoragePseudonymScope } from "./ai/pseudonym-scope";
import type { PseudonymScope } from "@/application/ports/pseudonym-scope";
import { ContourGuardLlmProvider } from "./ai/contour-guard-llm-provider";
import { UsageTrackingLlmProvider } from "./ai/usage-tracking-llm-provider";
import { AsyncLocalStorageLlmFeatureScope } from "./ai/llm-feature-scope";
import type { LlmFeatureScope } from "@/application/ports/llm-feature-scope";
import type { LlmUsageSink } from "@/application/ports/llm-usage-sink";
import type { UsageReportRepository } from "@/application/ports/usage-report-repository";
import { InMemoryUsageRepository } from "./persistence/in-memory-usage-repository";
import { PrismaUsageRepository } from "./persistence/prisma-usage-repository";
import {
  type GetUsageOwnerReport,
  type GetUsageReport,
  makeGetUsageOwnerReport,
  makeGetUsageReport,
} from "@/application/use-cases/get-usage-report";
import { StubSpeechToText } from "./ai/stt/stub-speech-to-text";
import { WhisperSpeechToText } from "./ai/stt/whisper-speech-to-text";
import { StubAiGateway } from "./ai/stub-ai-gateway";
import { StubWebSearchGateway } from "./ai/stub-web-search-gateway";
import { BraveSearchGateway } from "./ai/web-search-gateway";
import type { WebSearchGateway } from "@/application/ports/web-search-gateway";
import { type Env, loadEnv } from "./config/env";
import { ConsoleLogger, type Logger } from "./logging/logger";
import { ScryptPasswordHasher } from "./auth/scrypt-password-hasher";
import { StubNotifier } from "./notification/stub-notifier";
import { InMemorySessionRepository } from "./persistence/in-memory-session-repository";
import { InMemoryUserRepository } from "./persistence/in-memory-user-repository";
import { ODataErpGateway } from "./erp/odata-erp-gateway";
import { StubErpGateway } from "./erp/stub-erp-gateway";
import { InMemoryActivityRepository } from "./persistence/in-memory-activity-repository";
import { InMemoryAuditRepository } from "./persistence/in-memory-audit-repository";
import { InMemoryDealQualificationRepository } from "./persistence/in-memory-deal-qualification-repository";
import { PrismaDealQualificationRepository } from "./persistence/prisma-deal-qualification-repository";
import { InMemoryProposalRepository } from "./persistence/in-memory-proposal-repository";
import { PrismaProposalRepository } from "./persistence/prisma-proposal-repository";
import { ActivityFollowUpTaskCreator } from "./persistence/activity-follow-up-task-creator";
import { InMemoryDealEventRepository } from "./persistence/in-memory-deal-event-repository";
import { StoringDealEventRecorder } from "./persistence/storing-deal-event-recorder";
import { InMemoryNotificationRepository } from "./persistence/in-memory-notification-repository";
import { InMemoryTestActRepository } from "./persistence/in-memory-test-act-repository";
import { InMemoryClientRepository } from "./persistence/in-memory-client-repository";
import { InMemoryContactRepository } from "./persistence/in-memory-contact-repository";
import { InMemoryDealRepository } from "./persistence/in-memory-deal-repository";
import { InMemoryProductRepository } from "./persistence/in-memory-product-repository";
import { InMemoryReturnClaimRepository } from "./persistence/in-memory-return-claim-repository";
import { InMemoryShipmentRepository } from "./persistence/in-memory-shipment-repository";
import { InMemoryPackingRequestRepository } from "./persistence/in-memory-packing-request-repository";
import { InMemoryDefectItemRepository } from "./persistence/in-memory-defect-item-repository";
import { InMemoryOnboardingRepository } from "./persistence/in-memory-onboarding-repository";
import { InMemorySampleRequestRepository } from "./persistence/in-memory-sample-request-repository";
import { InMemoryTechRequestRepository } from "./persistence/in-memory-tech-request-repository";
import { PrismaActivityRepository } from "./persistence/prisma-activity-repository";
import { PrismaAuditRepository } from "./persistence/prisma-audit-repository";
import { PrismaClientRepository } from "./persistence/prisma-client-repository";
import { PrismaContactRepository } from "./persistence/prisma-contact-repository";
import { PrismaDealEventRepository } from "./persistence/prisma-deal-event-repository";
import { PrismaDealRepository } from "./persistence/prisma-deal-repository";
import { PrismaNotificationRepository } from "./persistence/prisma-notification-repository";
import { PrismaProductDescriptionRepository } from "./persistence/prisma-product-description-repository";
import { PrismaProductRepository } from "./persistence/prisma-product-repository";
import { PrismaQuotaRepository } from "./persistence/prisma-quota-repository";
import { PrismaSampleRequestRepository } from "./persistence/prisma-sample-request-repository";
import { PrismaTestActRepository } from "./persistence/prisma-test-act-repository";
import { PrismaAdditionalOrderRepository } from "./persistence/prisma-additional-order-repository";
import { PrismaOnboardingRepository } from "./persistence/prisma-onboarding-repository";
import { PrismaPackingRequestRepository } from "./persistence/prisma-packing-request-repository";
import { PrismaDefectItemRepository } from "./persistence/prisma-defect-item-repository";
import { PrismaReturnClaimRepository } from "./persistence/prisma-return-claim-repository";
import { PrismaUserRepository } from "./persistence/prisma-user-repository";
import { PrismaSessionRepository } from "./persistence/prisma-session-repository";
import { PrismaShipmentRepository } from "./persistence/prisma-shipment-repository";
import { PrismaTechRequestRepository } from "./persistence/prisma-tech-request-repository";
import type { DealId } from "@/domain/deal/deal";
import type { TestAct } from "@/domain/test-act/test-act";
import {
  managerLabel,
  personLabel,
  seedActivities,
  seedBalances,
  seedClients,
  seedContacts,
  seedReturnClaims,
  seedShipments,
  seedPackingRequests,
  seedDefectItems,
  seedOnboardings,
  seedDealEvents,
  seedDeals,
  seedAudits,
  seedTestActs,
  seedSampleRequests,
  seedReferenceTechRequests,
  seedUsers,
  seedNotifications,
  seedPrices,
  seedProducts,
  seedProductDescriptions,
  seedSalesOrders,
  seedPurchases,
  seedQuotas,
  seedStock,
  seedTechRequests,
  seedTechnologistIds,
  seedAdditionalOrders,
} from "./persistence/seed";

/** App composition: ready-to-use use-cases + services. */
export interface AppContainer {
  readonly createTechRequest: CreateTechRequest;
  readonly takeTechRequest: TakeTechRequest;
  readonly completeTechRequest: CompleteTechRequest;
  readonly listOpenTechRequests: ListOpenTechRequests;
  readonly listAllTechRequests: ListAllTechRequests;
  readonly listClients: ListClients;
  readonly getClientCard: GetClientCard;
  readonly getClientBalanceView: GetClientBalanceView;
  readonly listClientReturns: ListClientReturns;
  readonly getDispatchPlan: GetDispatchPlan;
  readonly listMyShipments: ListMyShipments;
  readonly cancelMyShipment: CancelMyShipment;
  readonly listLoadingShipments: ListLoadingShipments;
  readonly advanceLoadingShipment: AdvanceLoadingShipment;
  readonly listAccountingShipments: ListAccountingShipments;
  readonly advanceAccountingShipment: AdvanceAccountingShipment;
  readonly listPackingRequests: ListPackingRequests;
  readonly filePackingRequest: FilePackingRequest;
  readonly advancePackingRequest: AdvancePackingRequest;
  readonly listDefectItems: ListDefectItems;
  readonly fileDefectItem: FileDefectItem;
  readonly advanceDefectItem: AdvanceDefectItem;
  readonly listOnboardings: ListOnboardings;
  readonly startOnboarding: StartOnboarding;
  readonly submitOnboarding: OnboardingTransition;
  readonly approveOnboarding: OnboardingTransition;
  readonly rejectOnboarding: OnboardingTransition;
  readonly setOnboardingDoc: SetOnboardingDoc;
  readonly advanceShipment: AdvanceShipmentUseCase;
  readonly fileReturnClaim: FileReturnClaim;
  readonly advanceReturnClaim: ProgressReturnClaim;
  readonly rejectReturnClaim: ProgressReturnClaim;
  readonly listDeals: ListDeals;
  readonly listDealsWithStatus: ListDealsWithStatus;
  readonly getFunnelAnalytics: GetFunnelAnalytics;
  readonly getSalesAnalytics: GetSalesAnalytics;
  readonly getCustomerProductMatrix: GetCustomerProductMatrix;
  readonly getProductRecommendations: GetProductRecommendations;
  readonly getAssortmentAnalysis: GetAssortmentAnalysis;
  readonly getAssortmentPromotions: GetAssortmentPromotions;
  readonly getProcurementAnalysis: GetProcurementAnalysis;
  readonly getMyOpenTasks: GetMyOpenTasks;
  /** Role-based "Home": a bento dashboard of "what should I do right now" (#190). */
  readonly getHomeDashboard: GetHomeDashboard;
  readonly login: Login;
  readonly logout: Logout;
  readonly authenticate: Authenticate;
  readonly advanceDealStage: AdvanceDealStage;
  readonly revertDealStage: RevertDealStage;
  readonly setDealOutcome: SetDealOutcome;
  readonly setDealGoal: SetDealGoal;
  readonly createClient: CreateClient;
  readonly updateClient: UpdateClient;
  readonly createDeal: CreateDeal;
  readonly launchSkuQualification: LaunchSkuQualification;
  readonly updateDeal: UpdateDeal;
  readonly deleteDeal: DeleteDeal;
  readonly assignDealManager: AssignDealManager;
  readonly saveProductionAudit: SaveProductionAudit;
  readonly updateProductionAudit: UpdateProductionAudit;
  readonly saveDealQualification: SaveDealQualificationUseCase;
  readonly getDealQualification: GetDealQualificationUseCase;
  readonly saveProposal: SaveProposalUseCase;
  readonly getProposal: GetProposalUseCase;
  readonly recordTestAct: RecordTestAct;
  readonly sendTestAct: SendTestAct;
  readonly listTestActsByDeal: (dealId: DealId) => Promise<readonly TestAct[]>;
  readonly requestSample: RequestSample;
  readonly createShipment: CreateShipment;
  readonly updateSampleRequest: UpdateSampleRequest;
  readonly placeCustomerOrder: PlaceCustomerOrder;
  readonly getDealWorkspace: GetDealWorkspace;
  readonly recordActivity: RecordActivity;
  readonly completeTask: CompleteTask;
  readonly listActivitiesByClient: ListActivitiesByClient;
  readonly draftActFromVoice: DraftActFromVoice;
  readonly draftActivityFromVoice: DraftActivityFromVoice;
  readonly stt: SpeechToText;
  readonly listProducts: ListProducts;
  readonly listProductsWithStock: ListProductsWithStock;
  readonly syncNomenclature: SyncNomenclature;
  readonly listProductDescriptions: ListProductDescriptions;
  readonly generateProductDescriptions: GenerateProductDescriptions;
  readonly buildProposalDraft: BuildProposalDraft;
  readonly askManagerAssistant: AskManagerAssistant;
  /** Assistant conversation history (record/list/open/search), RBAC by owner. */
  readonly recordAssistantExchange: RecordAssistantExchange;
  readonly listAssistantConversations: ListAssistantConversations;
  readonly getAssistantConversation: GetAssistantConversation;
  readonly searchAssistantConversations: SearchAssistantConversations;
  readonly suggestNextStep: SuggestNextStep;
  readonly draftClientMessage: DraftClientMessage;
  readonly listNotifications: ListNotifications;
  readonly countUnreadNotifications: CountUnreadNotifications;
  readonly markNotificationRead: MarkNotificationRead;
  readonly listQuotas: ListQuotas;
  readonly reserveFromQuota: ReserveFromQuota;
  readonly allocateDeficit: AllocateDeficit;
  readonly createAdditionalOrder: CreateAdditionalOrderUseCase;
  readonly listAdditionalOrdersByDate: ListAdditionalOrdersByDate;
  readonly listAdditionalOrdersByParent: ListAdditionalOrdersByParent;
  readonly ai: AiGateway;
  /** Report of LLM token spend over a period (#216) -- for the head of sales. */
  readonly getUsageReport: GetUsageReport;
  /** LLM token spend by employee over a period (#401) -- for the head of sales. */
  readonly getUsageOwnerReport: GetUsageOwnerReport;
  readonly logger: Logger;
}

// Cache the container on globalThis: server actions and page rendering in Next can get
// different module instances -- a shared singleton keeps in-memory state between
// requests within the process (for prod the state moves to the DB).
const globalForContainer = globalThis as unknown as {
  __crmProContainer?: AppContainer;
  __crmProContainerBuildId?: symbol;
};

// Build id -- a new Symbol on every module evaluation. In dev, Turbopack/HMR keeps the
// globalThis singleton alive across edits, so a container built before a new use-case
// was added doesn't have its method ("X is not a function"). A fresh build id on HMR
// recompilation forces a rebuild of the container with the current shape. No HMR in
// prod -- the singleton behaves as before.
const CONTAINER_BUILD_ID = Symbol("crm-pro-container-build");
const IS_DEV = process.env.NODE_ENV !== "production";

/** OpenRouter free-tier model: capable, zero marginal cost -- a safe default for a
 * public demo (see docs/LLM_SETUP.md). */
const OPENROUTER_DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
/** Max real (non-stub) OpenRouter calls per UTC day on the public demo (see
 * BudgetCappedAiGateway) -- keeps a shared demo key from ever running up a bill. */
const OPENROUTER_DAILY_CALL_BUDGET = 200;

/** The calling employee's id, for usage-spend attribution (#216). Outside a request
 * context (background jobs, tests) -> null; a dynamic import breaks the
 * current-user <-> composition-root cycle. */
async function resolveCurrentUserId(): Promise<string | null> {
  try {
    const { resolveViewer } = await import("./config/current-user");
    return (await resolveViewer())?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * AI gateway selection by env. `stub` -- a placeholder (demo). `live` -- a real LLM
 * behind the abstract `LlmProvider`. The Claude/OpenAI adapters go over fetch (no SDK).
 * `openrouter` is demo-only: a separate key, a hard per-call token cap, and a daily
 * call budget that degrades to the stub instead of ever failing the request (see
 * `buildOpenRouterAiGateway`).
 */
function buildAiGateway(
  env: Env,
  logger: Logger,
  pseudonymScope: PseudonymScope,
  featureScope: LlmFeatureScope,
  usageSink: LlmUsageSink,
): AiGateway {
  if (env.AI_MODE !== "live") {
    return new StubAiGateway();
  }
  if (env.AI_PROVIDER === "openrouter") {
    return buildOpenRouterAiGateway(env, logger, pseudonymScope, featureScope, usageSink);
  }
  if (!env.AI_API_KEY) {
    throw new Error("AI_MODE=live requires AI_API_KEY");
  }
  // Compliance safety net: a global LLM in production only with explicit ALLOW_GLOBAL_LLM.
  assertProviderCompliant({
    mode: env.AI_MODE,
    provider: env.AI_PROVIDER,
    isProduction: process.env.NODE_ENV === "production",
    allowGlobal: env.ALLOW_GLOBAL_LLM === "true",
  });
  // PII minimization: mask phones/names/tax IDs before sending to any LLM, restore them
  // in the response. Names/tax IDs are supplied per-request via scope (the use-case
  // collects them from the CRM snapshot, #282/#296) -- the provider is global, so it
  // takes the lists from the active request context.
  let provider: LlmProvider = new PseudonymizingLlmProvider(
    buildLlmProvider(env, env.AI_API_KEY, logger),
    { scope: pseudonymScope },
  );
  // Token spend tracking (#216): the outermost decorator reads the actual usage and the
  // feature label (featureScope), writes the fact to the journal fire-and-forget. Flag
  // USAGE_TRACKING=off -- the decorator isn't attached (zero overhead). Data-residency
  // policy: only numbers + labels are written.
  if (env.USAGE_TRACKING === "on") {
    provider = new UsageTrackingLlmProvider(provider, {
      sink: usageSink,
      featureScope,
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL ?? (env.AI_PROVIDER === "openai" ? "gpt-4o" : "claude-opus-4-8"),
      now: () => new Date().toISOString(),
      resolveOwnerId: resolveCurrentUserId,
    });
  }
  // featureScope is always passed to the gateway: its wrappers are harmless even
  // without the tracking decorator.
  return new LlmAiGateway(provider, featureScope);
}

/**
 * OpenRouter wiring: demo-safe and budget-capped, so the public deployment can run a
 * real LLM without a way to run up a bill or crash on misconfiguration.
 * - Missing `OPENROUTER_API_KEY` -> falls back to the stub, exactly like `AI_MODE=stub`
 *   (never throws -- unlike the other providers above, which fail loud on a missing key).
 * - Same compliance/PII/usage-tracking pipeline as the other providers (ADR-0007: a
 *   global model, so `ContourGuardLlmProvider` applies via `buildLlmProvider`).
 * - Wrapped in `BudgetCappedAiGateway`: after `OPENROUTER_DAILY_CALL_BUDGET` calls in a
 *   UTC day, further calls degrade to the stub with an honest note instead of paying
 *   for (or rate-limiting into failure) unlimited demo traffic.
 */
function buildOpenRouterAiGateway(
  env: Env,
  logger: Logger,
  pseudonymScope: PseudonymScope,
  featureScope: LlmFeatureScope,
  usageSink: LlmUsageSink,
): AiGateway {
  if (!env.OPENROUTER_API_KEY) {
    return new StubAiGateway();
  }
  assertProviderCompliant({
    mode: env.AI_MODE,
    provider: env.AI_PROVIDER,
    isProduction: process.env.NODE_ENV === "production",
    allowGlobal: env.ALLOW_GLOBAL_LLM === "true",
  });
  let provider: LlmProvider = new PseudonymizingLlmProvider(
    buildLlmProvider(env, env.OPENROUTER_API_KEY, logger),
    { scope: pseudonymScope },
  );
  if (env.USAGE_TRACKING === "on") {
    provider = new UsageTrackingLlmProvider(provider, {
      sink: usageSink,
      featureScope,
      provider: env.AI_PROVIDER,
      model: env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL,
      now: () => new Date().toISOString(),
      resolveOwnerId: resolveCurrentUserId,
    });
  }
  const live: AiGateway = new LlmAiGateway(provider, featureScope);
  return new BudgetCappedAiGateway({
    live,
    stub: new StubAiGateway(),
    dailyLimit: OPENROUTER_DAILY_CALL_BUDGET,
    logger,
  });
}

function buildLlmProvider(env: Env, apiKey: string, logger: Logger): LlmProvider {
  if (env.AI_PROVIDER === "openai") {
    // The compliant provider: allowed for real PII (DATA_POLICY).
    return new OpenAiLlmProvider(
      {
        apiKey,
        model: env.AI_MODEL ?? "gpt-4o",
        baseUrl: env.AI_BASE_URL ?? "https://api.openai.com/v1",
      },
      logger,
    );
  }
  if (env.AI_PROVIDER === "anthropic") {
    // A global model -- only code/anonymized/synthetic data (DATA_POLICY). Data-residency
    // guard (#179): block an outgoing payload with prices/counterparties/PII -- trade
    // secrets stay in the compliant contour only. The guard is INSIDE the pseudonymizer
    // so it sees the text actually being sent.
    return new ContourGuardLlmProvider(
      new AnthropicLlmProvider(
        {
          apiKey,
          model: env.AI_MODEL ?? "claude-opus-4-8",
          baseUrl: env.AI_BASE_URL ?? "https://api.anthropic.com",
        },
        logger,
      ),
    );
  }
  if (env.AI_PROVIDER === "openrouter") {
    // A global model too (proxies to third-party model hosts) -- same data-contour
    // guard as anthropic (DATA_POLICY/ADR-0007).
    return new ContourGuardLlmProvider(
      new OpenRouterLlmProvider(
        {
          apiKey,
          model: env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL,
          baseUrl: env.AI_BASE_URL ?? "https://openrouter.ai/api/v1",
        },
        logger,
      ),
    );
  }
  throw new Error(
    `AI_PROVIDER=${env.AI_PROVIDER} is not implemented yet -- use openai, anthropic, openrouter, or AI_MODE=stub.`,
  );
}

/**
 * STT by env: live + openai + key -> OpenAI Whisper (same key as the compliant LLM,
 * allowed for real PII); otherwise -- a deterministic stub.
 */
function buildSpeechToText(env: Env, logger: Logger): SpeechToText {
  if (env.AI_MODE === "live" && env.AI_PROVIDER === "openai" && env.AI_API_KEY) {
    return new WhisperSpeechToText(
      {
        apiKey: env.AI_API_KEY,
        baseUrl: "https://api.openai.com/v1",
        language: "en",
      },
      logger,
    );
  }
  return new StubSpeechToText();
}

/**
 * Web search by env: live + brave + key -> the real Brave Search API; live without a
 * key -> a clear error (never silent); otherwise -- a stub (demo).
 */
function buildWebSearch(env: Env, logger: Logger): WebSearchGateway {
  if (env.WEB_SEARCH_MODE !== "live") {
    return new StubWebSearchGateway();
  }
  if (env.WEB_SEARCH_PROVIDER === "brave") {
    if (!env.WEB_SEARCH_API_KEY) {
      throw new Error("WEB_SEARCH_MODE=live (brave) requires WEB_SEARCH_API_KEY");
    }
    return new BraveSearchGateway(
      {
        apiKey: env.WEB_SEARCH_API_KEY,
        baseUrl: "https://api.search.brave.com",
      },
      logger,
    );
  }
  throw new Error(
    `WEB_SEARCH_PROVIDER=${env.WEB_SEARCH_PROVIDER} is not implemented yet -- use brave or WEB_SEARCH_MODE=stub.`,
  );
}

/**
 * Composition Root: the single place where concrete adapters are wired to use-cases.
 * Implementation selection happens via environment variables.
 */
export function getContainer(): AppContainer {
  const cached = globalForContainer.__crmProContainer;
  if (cached && (!IS_DEV || globalForContainer.__crmProContainerBuildId === CONTAINER_BUILD_ID)) {
    return cached;
  }

  const env = loadEnv();
  const logger = new ConsoleLogger();

  // PERSISTENCE_MODE=postgres wires Prisma-backed repos; default is in-memory (with seed).
  const usePostgres = env.PERSISTENCE_MODE === "postgres";

  const clients = usePostgres
    ? new PrismaClientRepository()
    : new InMemoryClientRepository(seedClients);
  const contacts = usePostgres
    ? new PrismaContactRepository()
    : new InMemoryContactRepository(seedContacts);
  const returns = usePostgres
    ? new PrismaReturnClaimRepository()
    : new InMemoryReturnClaimRepository(seedReturnClaims);
  const shipments = usePostgres
    ? new PrismaShipmentRepository()
    : new InMemoryShipmentRepository(seedShipments);
  const packing = usePostgres
    ? new PrismaPackingRequestRepository()
    : new InMemoryPackingRequestRepository(seedPackingRequests);
  const defects = usePostgres
    ? new PrismaDefectItemRepository()
    : new InMemoryDefectItemRepository(seedDefectItems);
  const onboardings = usePostgres
    ? new PrismaOnboardingRepository()
    : new InMemoryOnboardingRepository(seedOnboardings);
  const products = usePostgres
    ? new PrismaProductRepository()
    : new InMemoryProductRepository(seedProducts);
  const productDescriptions = usePostgres
    ? new PrismaProductDescriptionRepository()
    : new InMemoryProductDescriptionRepository(seedProductDescriptions);
  const deals = usePostgres ? new PrismaDealRepository() : new InMemoryDealRepository(seedDeals);
  const audits = usePostgres
    ? new PrismaAuditRepository()
    : new InMemoryAuditRepository(seedAudits);
  const qualifications = usePostgres
    ? new PrismaDealQualificationRepository()
    : new InMemoryDealQualificationRepository();
  const proposals = usePostgres ? new PrismaProposalRepository() : new InMemoryProposalRepository();
  const testActs = usePostgres
    ? new PrismaTestActRepository()
    : new InMemoryTestActRepository(seedTestActs);
  const activities = usePostgres
    ? new PrismaActivityRepository()
    : new InMemoryActivityRepository(seedActivities);
  const notifications = usePostgres
    ? new PrismaNotificationRepository()
    : new InMemoryNotificationRepository(seedNotifications);
  const samples = usePostgres
    ? new PrismaSampleRequestRepository()
    : new InMemorySampleRequestRepository(seedSampleRequests);
  const techRequests = usePostgres
    ? new PrismaTechRequestRepository()
    : new InMemoryTechRequestRepository([...seedTechRequests, ...seedReferenceTechRequests]);
  const quotas = usePostgres
    ? new PrismaQuotaRepository()
    : new InMemoryQuotaRepository(seedQuotas);
  const additionalOrders = usePostgres
    ? new PrismaAdditionalOrderRepository()
    : new InMemoryAdditionalOrderRepository(seedAdditionalOrders);
  const dealEvents = usePostgres
    ? new PrismaDealEventRepository()
    : new InMemoryDealEventRepository(seedDealEvents);
  const dealEventRecorder = new StoringDealEventRecorder(dealEvents);
  const followUpTasks = new ActivityFollowUpTaskCreator(activities);
  const passwordHasher = new ScryptPasswordHasher();
  const users = usePostgres
    ? new PrismaUserRepository()
    : new InMemoryUserRepository(seedUsers, passwordHasher);
  const sessions = usePostgres ? new PrismaSessionRepository() : new InMemorySessionRepository();
  const assistantConversations = usePostgres
    ? new PrismaAssistantConversationRepository()
    : new InMemoryAssistantConversationRepository();

  const erp: ErpGateway =
    env.ERP_MODE === "odata"
      ? new ODataErpGateway(
          {
            baseUrl: env.ERP_BASE_URL ?? "",
            username: env.ERP_USERNAME ?? "",
            password: env.ERP_PASSWORD ?? "",
          },
          logger,
        )
      : new StubErpGateway(
          seedPrices,
          seedStock,
          seedBalances,
          seedSalesOrders,
          seedPurchases,
          seedProducts.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            ...(p.barcode ? { barcode: p.barcode } : {}),
            ...((p.shelfLife ?? p.kit?.shelfLife)
              ? { shelfLife: p.shelfLife ?? p.kit?.shelfLife }
              : {}),
            ...(p.packaging ? { packaging: p.packaging } : {}),
          })),
        );

  // Per-request scope of known PII for the LLM pseudonymizer: the assistant use-case
  // collects names from the CRM snapshot and runs AI calls inside it, so the global
  // provider masks exactly those before sending them to the model (#282/#296).
  const pseudonymScope: PseudonymScope = new AsyncLocalStoragePseudonymScope();
  // LLM token spend tracking (#216): a feature label (ALS) + a journal (memory/postgres
  // by mode). The journal is a singleton on the container, surviving requests
  // (the in-memory cap guards against OOM).
  const featureScope: LlmFeatureScope = new AsyncLocalStorageLlmFeatureScope();
  const usageRepo: LlmUsageSink & UsageReportRepository = usePostgres
    ? new PrismaUsageRepository()
    : new InMemoryUsageRepository({
        maxRecent: env.USAGE_MEMORY_MAX_ROWS,
        maxDays: env.USAGE_RETENTION_DAYS,
      });
  const ai: AiGateway = buildAiGateway(env, logger, pseudonymScope, featureScope, usageRepo);
  // Web search for the assistant: a stub by default; the real Brave Search API is
  // wired through the same port by env WEB_SEARCH_MODE=live (see buildWebSearch).
  const webSearch: WebSearchGateway = buildWebSearch(env, logger);
  const notifier: Notifier = new StubNotifier(notifications, logger);

  // A single source of time: both deal health (listDealsWithStatus) and task tiles
  // (getHomeDashboard) are computed against one timestamp; swapped for a fixed one in tests.
  const clock = (): string => new Date().toISOString();

  // Use-cases reused by the composite getHomeDashboard dashboard -- a single source of
  // truth: assembled once here and referenced both in the container fields and the dashboard.
  const listDealsWithStatus = makeListDealsWithStatus({
    deals,
    activities,
    events: dealEvents,
    now: clock,
  });
  const getMyOpenTasks = makeGetMyOpenTasks({ deals, activities });
  const getFunnelAnalytics = makeGetFunnelAnalytics({ deals });
  const getSalesAnalytics = makeGetSalesAnalytics({ erp, products, labelManager: managerLabel });
  const listOpenTechRequests = makeListOpenTechRequests({ techRequests });
  const listAllTechRequests = makeListAllTechRequests({ techRequests });
  const getProcurementAnalysis = makeGetProcurementAnalysis({ erp, products });
  const getAssortmentAnalysis = makeGetAssortmentAnalysis({ erp, products });
  const listPackingRequests = makeListPackingRequests({ packing });
  const listDefectItems = makeListDefectItems({ defects });
  const listOnboardings = makeListOnboardings({ onboardings });
  const countUnreadNotifications = makeCountUnreadNotifications({ notifications });

  const container: AppContainer = {
    createClient: makeCreateClient({ clients }),
    updateClient: makeUpdateClient({ clients }),
    listClients: makeListClients({ clients }),
    getClientCard: makeGetClientCard({ clients, contacts, products, erp }),
    getClientBalanceView: makeGetClientBalanceView({ erp }),
    listClientReturns: makeListClientReturns({ returns }),
    getDispatchPlan: makeGetDispatchPlan({ shipments, clients }),
    listMyShipments: makeListMyShipments({ shipments, clients }),
    cancelMyShipment: makeCancelMyShipment({ shipments }),
    listLoadingShipments: makeListLoadingShipments({ shipments, clients }),
    advanceLoadingShipment: makeAdvanceLoadingShipment({ shipments }),
    listAccountingShipments: makeListAccountingShipments({ shipments, clients }),
    advanceAccountingShipment: makeAdvanceAccountingShipment({ shipments }),
    listPackingRequests,
    filePackingRequest: makeFilePackingRequest({ packing }),
    advancePackingRequest: makeAdvancePackingRequest({ packing }),
    listDefectItems,
    fileDefectItem: makeFileDefectItem({ defects }),
    advanceDefectItem: makeAdvanceDefectItem({ defects }),
    listOnboardings,
    startOnboarding: makeStartOnboarding({ onboardings }),
    submitOnboarding: makeSubmitOnboarding({ onboardings }),
    approveOnboarding: makeApproveOnboarding({ onboardings }),
    rejectOnboarding: makeRejectOnboarding({ onboardings }),
    setOnboardingDoc: makeSetOnboardingDoc({ onboardings }),
    advanceShipment: makeAdvanceShipment({ shipments }),
    fileReturnClaim: makeFileReturnClaim({ clients, returns }),
    advanceReturnClaim: makeAdvanceReturnClaim({ clients, returns }),
    rejectReturnClaim: makeRejectReturnClaim({ clients, returns }),
    listDeals: makeListDeals({ deals }),
    listDealsWithStatus,
    getFunnelAnalytics,
    getSalesAnalytics,
    getCustomerProductMatrix: makeGetCustomerProductMatrix({ erp, products }),
    getProductRecommendations: makeGetProductRecommendations({ clients, products, erp }),
    getAssortmentAnalysis,
    getAssortmentPromotions: makeGetAssortmentPromotions({ erp, products }),
    getProcurementAnalysis,
    getMyOpenTasks,
    getHomeDashboard: makeGetHomeDashboard({
      listDealsWithStatus,
      getMyOpenTasks,
      getFunnelAnalytics,
      getSalesAnalytics,
      listOpenTechRequests,
      getProcurementAnalysis,
      getAssortmentAnalysis,
      listPackingRequests,
      listDefectItems,
      listOnboardings,
      countUnreadNotifications,
      clients,
      activities,
      now: clock,
    }),
    login: makeLogin({ users, sessions, hasher: passwordHasher }),
    logout: makeLogout({ sessions }),
    authenticate: makeAuthenticate({ users, sessions }),
    advanceDealStage: makeAdvanceDealStage({
      deals,
      events: dealEventRecorder,
      tasks: followUpTasks,
      notifier,
    }),
    revertDealStage: makeRevertDealStage({
      deals,
      events: dealEventRecorder,
    }),
    setDealOutcome: makeSetDealOutcome({ deals, events: dealEventRecorder }),
    setDealGoal: makeSetDealGoal({ deals, events: dealEventRecorder }),
    createDeal: makeCreateDeal({ deals, clients }),
    launchSkuQualification: makeLaunchSkuQualification({ deals, clients, products }),
    updateDeal: makeUpdateDeal({ deals, clients }),
    deleteDeal: makeDeleteDeal({ deals, events: dealEventRecorder }),
    assignDealManager: makeAssignDealManager({ deals, notifier }),
    saveProductionAudit: makeSaveProductionAudit({ audits, deals }),
    updateProductionAudit: makeUpdateProductionAudit({ audits, deals }),
    saveDealQualification: makeSaveDealQualification({ qualifications, deals }),
    getDealQualification: makeGetDealQualification({ qualifications }),
    saveProposal: makeSaveProposal({ proposals, deals }),
    getProposal: makeGetProposal({ proposals }),
    recordTestAct: makeRecordTestAct({ acts: testActs, deals, notifier }),
    sendTestAct: makeSendTestAct({ acts: testActs, deals, notifier }),
    listTestActsByDeal: (dealId) => testActs.listByDealId(dealId),
    requestSample: makeRequestSample({
      deals,
      samples,
      erp,
      notifier,
      events: dealEventRecorder,
      technologistIds: seedTechnologistIds,
    }),
    createShipment: makeCreateShipment({ shipments, clients, products }),
    updateSampleRequest: makeUpdateSampleRequest({ samples }),
    placeCustomerOrder: makePlaceCustomerOrder({
      deals,
      erp,
      shipments,
      clients,
      products,
      events: dealEventRecorder,
      logger,
    }),
    getDealWorkspace: makeGetDealWorkspace({
      deals,
      audits,
      testActs,
      samples,
      activities,
      events: dealEvents,
      shipments,
    }),
    recordActivity: makeRecordActivity({ activities }),
    completeTask: makeCompleteTask({ activities }),
    listActivitiesByClient: makeListActivitiesByClient({ activities }),
    draftActFromVoice: makeDraftActFromVoice({ ai }),
    draftActivityFromVoice: makeDraftActivityFromVoice({ ai }),
    stt: buildSpeechToText(env, logger),
    listProducts: makeListProducts({ products }),
    listProductsWithStock: makeListProductsWithStock({ products, erp }),
    syncNomenclature: makeSyncNomenclature({ erp, products }),
    listProductDescriptions: makeListProductDescriptions({ descriptions: productDescriptions }),
    generateProductDescriptions: makeGenerateProductDescriptions({
      products,
      descriptions: productDescriptions,
      ai,
    }),
    buildProposalDraft: makeBuildProposalDraft({ deals, clients, products, erp, ai }),
    askManagerAssistant: makeAskManagerAssistant({
      deals,
      clients,
      activities,
      samples,
      testActs,
      erp,
      ai,
      webSearch,
      pseudonymScope,
      labelManager: managerLabel,
      labelPerson: personLabel,
    }),
    recordAssistantExchange: makeRecordAssistantExchange({
      conversations: assistantConversations,
    }),
    listAssistantConversations: makeListAssistantConversations({
      conversations: assistantConversations,
    }),
    getAssistantConversation: makeGetAssistantConversation({
      conversations: assistantConversations,
    }),
    searchAssistantConversations: makeSearchAssistantConversations({
      conversations: assistantConversations,
    }),
    suggestNextStep: makeSuggestNextStep({ deals, clients, activities, ai }),
    draftClientMessage: makeDraftClientMessage({
      deals,
      clients,
      activities,
      ai,
      labelManager: managerLabel,
    }),
    listNotifications: makeListNotifications({ notifications }),
    countUnreadNotifications,
    markNotificationRead: makeMarkNotificationRead({ notifications }),
    createTechRequest: makeCreateTechRequest({ techRequests, notifier }),
    takeTechRequest: makeTakeTechRequest({ techRequests }),
    completeTechRequest: makeCompleteTechRequest({ techRequests, deals, notifier }),
    listOpenTechRequests,
    listAllTechRequests,
    listQuotas: makeListQuotas({ quotas }),
    reserveFromQuota: makeReserveFromQuota({ quotas }),
    allocateDeficit: makeAllocateDeficit(),
    createAdditionalOrder: makeCreateAdditionalOrder({ additionalOrders }),
    listAdditionalOrdersByDate: makeListAdditionalOrdersByDate({ additionalOrders }),
    listAdditionalOrdersByParent: makeListAdditionalOrdersByParent({ additionalOrders }),
    ai,
    getUsageReport: makeGetUsageReport({ usage: usageRepo }),
    getUsageOwnerReport: makeGetUsageOwnerReport({ usage: usageRepo, labelOwner: personLabel }),
    logger,
  };
  globalForContainer.__crmProContainer = container;
  globalForContainer.__crmProContainerBuildId = CONTAINER_BUILD_ID;
  return container;
}
