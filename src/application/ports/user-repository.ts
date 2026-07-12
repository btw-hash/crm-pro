import type { User, UserId } from "@/domain/user/user";

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: UserId): Promise<User | null>;
}
