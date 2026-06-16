/**
 * Public domain types and method parameter objects.
 *
 * Result *data* shapes we build ourselves use camelCase. A few types mirror raw
 * Fragment API responses and keep the wire field names (e.g. `req_id`).
 */

// ==================== AUTH ====================

export interface FetchHashParams {
  /** Page to scrape the api hash from. Defaults to `https://fragment.com/`. */
  url?: string;
}

export interface FetchHashData {
  hash: string;
}

// ==================== USERS ====================

export interface NickToHashParams {
  /** The @username to look up (without the `@`). */
  nickname: string;
}

/** Raw Fragment API response for a username search. */
export interface NickToHashData {
  ok: boolean;
  found?: {
    myself?: boolean;
    recipient: string;
    photo?: string;
    name?: string;
  };
  error?: string;
  [key: string]: unknown;
}

// ==================== UTILS ====================

export interface DecodePayloadParams {
  /** Base64-encoded payload string. */
  payload: string;
}

export interface DecodePayloadData {
  /** The original (un-decoded) base64 payload. */
  payload: string;
  /** The decoded, human-readable comment text. */
  decoded: string;
}

// ==================== STARS ====================

export interface GetStarsPriceParams {
  /** Number of stars (number or numeric string). */
  quantity: number | string;
}

export interface StarsPrice {
  ok: boolean;
  curPrice: {
    /** Price in TON, e.g. `"0.2774"`. */
    TON: string;
    /** Price in USD, e.g. `"1.5"`. */
    USDT: string;
  };
}

export interface InitStarsPaymentParams {
  /** Recipient hash (from {@link NickToHashData}). */
  recipient: string;
  /** Amount of stars to buy. */
  quantity: number;
}

/** Raw Fragment API response for `initBuyStarsRequest`. */
export interface PaymentInit {
  req_id: string;
  myself?: boolean;
  to_bot?: boolean;
  amount: string;
  [key: string]: unknown;
}

export interface GetPaymentInfoParams {
  /** The `req_id` returned by {@link StarsService.initPayment}. */
  requestId: string;
}

export interface PaymentMessage {
  address: string;
  amount: string;
  payload: string;
}

/** Raw Fragment API response for `getBuyStarsLink`. */
export interface PaymentInfo {
  ok: boolean;
  transaction?: {
    validUntil?: number;
    from?: string;
    messages: PaymentMessage[];
  };
  error?: string;
  [key: string]: unknown;
}

// ==================== PREMIUM ====================

export interface GetPremiumPriceParams {
  /** Subscription length in months (default `12`). */
  months?: number;
}

export interface PremiumOption {
  duration: string | null;
  priceTon: string | null;
  priceUsd: string | null;
  sale: string | null;
}

export interface PremiumPrice {
  options: PremiumOption[];
  tonRate: number | null;
}

// ==================== TON ====================

export interface LiteServer {
  ip: number;
  port: number;
  id: { "@type": string; key: string };
  /** Human-readable dotted IP, added by {@link TonService.getRandomLiteServer}. */
  ip_readable?: string;
  [key: string]: unknown;
}

export interface TonGlobalConfig {
  liteservers: LiteServer[];
  [key: string]: unknown;
}

export interface GetBalanceParams {
  /** TON wallet address to query. */
  address: string;
}

export interface WalletBalance {
  nano: number;
  ton: number;
  source: "toncenter" | "tonconsole";
}

export interface SendTonParams {
  /** Recipient TON address. */
  destinationAddress: string;
  /** Amount to send, in TON (e.g. `0.21`). */
  amount: number;
  /** Optional text comment (e.g. the decoded Stars payload). */
  payload?: string;
}

export interface SendTonData {
  destination: string;
  amount: number;
  payload: string;
  /** Sender wallet address. */
  sender: string;
  balanceBefore: {
    nano: number;
    ton: number;
  };
}

// ==================== USERS / ACCOUNT ====================

export interface UserProfile {
  name?: string;
  username?: string;
  avatar?: string | null;
  verified?: boolean;
  wallet?: string;
  walletVerified?: boolean;
}

export interface Session {
  device?: string;
  status?: string;
  location?: string;
  datetime?: string;
  dateText?: string;
  sessionId?: string;
}

export interface SessionList {
  account: {
    username?: string;
    avatar?: string;
    tonWallet?: string;
    [key: string]: unknown;
  };
  sessions: Session[];
}
