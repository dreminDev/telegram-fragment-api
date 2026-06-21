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

/** Payment method accepted by Fragment's Stars checkout. */
export type StarsPaymentMethod =
  | "ton"
  | "usdt_ton"
  | "usdt_eth"
  | "usdt_pol"
  | "usdc_eth"
  | "usdc_base"
  | "usdc_pol";

export interface InitStarsPaymentParams {
  /** Recipient hash (from {@link NickToHashData}). */
  recipient: string;
  /** Amount of stars to buy. */
  quantity: number;
  /**
   * Payment currency/chain. Defaults to `"ton"` (native TON, signable with a
   * wallet seed via {@link V4R2Service.send}).
   */
  paymentMethod?: StarsPaymentMethod;
}

/** Raw Fragment API response for `initBuyStarsRequest`. */
export interface PaymentInit {
  req_id: string;
  myself?: boolean;
  to_bot?: boolean;
  amount: string;
  /** Set by Fragment when no TON wallet is connected to the account. */
  need_ton?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface GetPaymentInfoParams {
  /** The `req_id` returned by {@link StarsService.initPayment}. */
  requestId: string;
  /** Whether to reveal the sender's name to the recipient. Defaults to `false`. */
  showSender?: boolean;
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
  /**
   * Fragment-side method that **must** be POSTed after the TON transfer lands,
   * carrying `{account, device, boc, ...confirm_params}`. Without this final
   * call Fragment never matches the on-chain payment to the `req_id`, so Stars
   * are not credited — even though the TON debits successfully.
   */
  confirm_method?: string;
  /** Extra fields Fragment expects in the {@link confirm_method} POST. */
  confirm_params?: Record<string, unknown>;
  /** Set by Fragment when the purchase needs extra verification. */
  need_verify?: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * TON Connect-style account JSON Fragment expects in the post-broadcast confirm
 * call. Build with {@link WalletService.getAccount} from your `walletSeed`.
 */
export interface TonConnectAccount {
  /** Raw address, e.g. `0:00b9fa57...`. */
  address: string;
  /** Public key in hex (no `0x` prefix). */
  publicKey: string;
  /** `"-239"` for mainnet, `"-3"` for testnet. */
  chain: string;
  /** Base64 BoC of the wallet's StateInit cell. */
  walletStateInit: string;
}

/**
 * TON Connect-style device JSON sent alongside {@link TonConnectAccount}.
 * Fragment doesn't verify the contents, so a hardcoded "Tonkeeper" hint is
 * enough.
 */
export interface TonConnectDevice {
  platform: string;
  appName: string;
  appVersion: string;
  maxProtocolVersion: number;
  features: unknown[];
}

export interface ConfirmStarsPaymentParams {
  /** `confirm_method` returned by {@link StarsService.getPaymentInfo}. */
  method: string;
  /** `confirm_params` returned by {@link StarsService.getPaymentInfo}. */
  params?: Record<string, unknown>;
  /** TonConnect account JSON for the wallet that paid. */
  account: TonConnectAccount;
  /** Base64 BoC of the external message that was broadcast on-chain. */
  boc: string;
  /** Optional device override; a default Tonkeeper hint is used otherwise. */
  device?: TonConnectDevice;
}

export interface ConfirmStarsPaymentData {
  ok: boolean;
  [key: string]: unknown;
}

export interface PurchaseStarsParams {
  /** Recipient hash (from {@link NickToHashData}). */
  recipient: string;
  /** Amount of stars to buy. */
  quantity: number;
  /** Whether to reveal the sender's name to the recipient. Defaults to `false`. */
  showSender?: boolean;
  /** Optional device override; a default Tonkeeper hint is used otherwise. */
  device?: TonConnectDevice;
}

export interface PurchaseStarsData {
  /** The `req_id` of the matched Fragment order. */
  reqId: string;
  /** TON amount sent, in human form (e.g. `0.4561`). */
  amount: number;
  /** TON amount sent, in exact nanoTON. */
  amountNano: string;
  /** Destination address (Fragment's collector wallet). */
  destination: string;
  /** Sender wallet (derived from {@link FragmentCredentials.walletSeed}). */
  sender: string;
  /** Base64 BoC of the external message that was broadcast and confirmed. */
  boc: string;
  /** Raw response from Fragment's confirm call. */
  confirm: ConfirmStarsPaymentData;
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
  /**
   * Amount in human TON (e.g. `0.21`). Provide this **or** {@link amountNano}.
   * Convenient, but goes through a decimal→nano conversion.
   */
  amount?: number;
  /**
   * Exact amount in nanoTON (e.g. Fragment's `msg.amount` string). Provide this
   * **or** {@link amount}. Preferred when forwarding a Fragment payment — it is
   * exact and avoids float rounding / the `/1e9` mistake.
   */
  amountNano?: string | bigint;
  /** Optional plain **text** comment. Ignored if {@link payloadCell} is set. */
  payload?: string;
  /**
   * Exact message body as a **base64 BoC cell** (e.g. Fragment's `msg.payload`).
   * Preferred for Stars/Fragment payments — it is byte-identical to what the
   * website sends via TON Connect, so Fragment matches the `Ref#…`. A
   * re-encoded text comment may not match.
   */
  payloadCell?: string;
}

/** A wallet address in both user-friendly and raw forms. */
export interface WalletAddress {
  /** User-friendly form, e.g. `EQAAuf...` / `UQAAuf...`. */
  friendly: string;
  /** Raw form, e.g. `0:00b9fa57...` — compare this with a Fragment `transaction.from`. */
  raw: string;
}

export interface SendTonData {
  destination: string;
  /** Amount sent, in human TON. */
  amount: number;
  /** Amount sent, in exact nanoTON. */
  amountNano: string;
  payload: string;
  /** Sender wallet address. */
  sender: string;
  /**
   * Base64 BoC of the external message that was broadcast — pass this verbatim
   * as `boc` to {@link StarsService.confirmPayment}. Fragment matches Stars
   * orders by this BoC, so it must come from the same signed message we sent.
   */
  boc: string;
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
