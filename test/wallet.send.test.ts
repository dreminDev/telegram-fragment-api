import { beforeEach, describe, expect, it, vi } from "vitest";

// Mutable mock state shared with the hoisted module mocks.
const h = vi.hoisted(() => ({
  balanceNano: 5_000_000_000n, // 5 TON
  sendTransfer: vi.fn(async () => undefined),
  getSeqno: vi.fn(async () => 7),
  internal: vi.fn((args: unknown) => args),
}));

vi.mock("@ton/crypto", () => ({
  mnemonicToPrivateKey: vi.fn(async () => ({
    publicKey: Buffer.alloc(32, 1),
    secretKey: Buffer.alloc(64, 2),
  })),
}));

vi.mock("@ton/ton", () => ({
  TonClient: vi.fn().mockImplementation(() => ({
    open: () => ({
      getBalance: async () => h.balanceNano,
      getSeqno: h.getSeqno,
      sendTransfer: h.sendTransfer,
    }),
  })),
  WalletContractV4: {
    create: vi.fn(() => ({ address: { toString: () => "EQAsender_addr" } })),
  },
  internal: h.internal,
  toNano: vi.fn((v: string) => BigInt(Math.round(Number(v) * 1e9))),
  fromNano: vi.fn((v: bigint | string) => (Number(v) / 1e9).toString()),
}));

import { Fragment } from "../src/Fragment.js";

function fundedClient() {
  return new Fragment({
    toncenterApiKey: "tc_key",
    walletSeed: "one two three four five six seven eight nine ten eleven twelve",
  });
}

describe("ton.wallet.v4r2.send", () => {
  beforeEach(() => {
    h.balanceNano = 5_000_000_000n;
    h.sendTransfer.mockClear();
    h.internal.mockClear();
  });

  it("sends TON and returns the transaction data", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amount: 0.21,
      payload: "50 Telegram Stars",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.sender).toBe("EQAsender_addr");
      expect(res.data.destination).toBe("UQdest");
      expect(res.data.amount).toBe(0.21);
      expect(res.data.balanceBefore.ton).toBe(5);
    }
    expect(h.sendTransfer).toHaveBeenCalledOnce();
    // the comment payload is forwarded to internal()
    expect(h.internal).toHaveBeenCalledWith(
      expect.objectContaining({ to: "UQdest", body: "50 Telegram Stars", bounce: false }),
    );
  });

  it("accepts an exact amountNano (no float conversion)", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amountNano: "456100000",
      payload: "50 Telegram Stars",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.amountNano).toBe("456100000");
      expect(res.data.amount).toBe(0.4561);
    }
    expect(h.internal).toHaveBeenCalledWith(
      expect.objectContaining({ to: "UQdest", value: 456100000n }),
    );
  });

  it("rejects providing both amount and amountNano", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amount: 0.21,
      amountNano: "210000000",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("rejects when neither amount nor amountNano is given", async () => {
    const client = fundedClient();
    // @ts-expect-error intentionally missing amount
    const res = await client.ton.wallet.v4r2.send({ destinationAddress: "UQdest" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("refuses to send when the balance is too low", async () => {
    h.balanceNano = 100_000_000n; // 0.1 TON
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amount: 0.21,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("INSUFFICIENT_FUNDS");
    expect(h.sendTransfer).not.toHaveBeenCalled();
  });

  it("validates the destination address", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "",
      amount: 1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("validates a positive amount", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amount: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("requires a toncenter api key", async () => {
    const client = new Fragment({ walletSeed: "a b c" });
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amount: 1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("requires a wallet seed", async () => {
    const client = new Fragment({ toncenterApiKey: "tc" });
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amount: 1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });
});
