export type SolanaResourceType = "account" | "transaction";

export interface NavigationContext {
  tabId: number;
  source: "solscan" | "solanafm" | "explorer";
  chain: "solana";
  network: "mainnet-beta";
  resourceType: SolanaResourceType;
  resourceId: string;
  observedAt: string;
  sourceUrl: string;
}
