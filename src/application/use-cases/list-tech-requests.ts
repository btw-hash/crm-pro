import type { TechRequestRepository } from "@/application/ports/tech-request-repository";
import type { TechRequest } from "@/domain/tech-request/tech-request";

export type ListOpenTechRequests = () => Promise<readonly TechRequest[]>;

export function makeListOpenTechRequests(deps: {
  techRequests: TechRequestRepository;
}): ListOpenTechRequests {
  return function listOpenTechRequests() {
    return deps.techRequests.listActive();
  };
}

export type ListAllTechRequests = () => Promise<readonly TechRequest[]>;

export function makeListAllTechRequests(deps: {
  techRequests: TechRequestRepository;
}): ListAllTechRequests {
  return function listAllTechRequests() {
    return deps.techRequests.listAll();
  };
}
