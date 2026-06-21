import { beforeEach, describe, expect, it, vi } from "vitest";

// Mutable mock state shared with the hoisted module mocks.
const h = vi.hoisted(() => ({
  balanceNano: 5_000_000_000n, // 5 TON
  sendFile: vi.fn(async () => undefined),
  getSeqno: vi.fn(async () => 7),
  internal: vi.fn((args: unknown) => args),
  createTransfer: vi.fn(() => ({ _kind: "signed-body" })),
}));

vi.mock("@ton/crypto", () => ({
  mnemonicToPrivateKey: vi.fn(async () => ({
    publicKey: Buffer.alloc(32, 1),
    secretKey: Buffer.alloc(64, 2),
  })),
}));

vi.mock("@ton/core", () => {
  const fakeCell = {
    toBoc: () => Buffer.from("fake-boc-bytes"),
  };
  return {
    Cell: {
      fromBase64: vi.fn((s: string) => {
        if (!s.startsWith("te6")) throw new Error("invalid boc");
        return { _kind: "decoded-boc" };
      }),
    },
    beginCell: vi.fn(() => ({
      store: vi.fn().mockReturnThis(),
      endCell: vi.fn(() => fakeCell),
    })),
    external: vi.fn((args: unknown) => args),
    storeMessage: vi.fn(),
    storeStateInit: vi.fn(),
  };
});

vi.mock("@ton/ton", () => ({
  TonClient: vi.fn().mockImplementation(() => ({
    open: () => ({
      getBalance: async () => h.balanceNano,
      getSeqno: h.getSeqno,
    }),
    sendFile: h.sendFile,
  })),
  WalletContractV4: {
    create: vi.fn(() => ({
      address: {
        toString: () => "EQAsender_addr",
        toRawString: () => "0:sender_raw",
      },
      init: { code: { _kind: "code" }, data: { _kind: "data" } },
      createTransfer: h.createTransfer,
    })),
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
    h.sendFile.mockClear();
    h.createTransfer.mockClear();
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
    expect(h.sendFile).toHaveBeenCalledOnce();
    expect(h.createTransfer).toHaveBeenCalledOnce();
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

  it("sends the exact BoC cell when payloadCell is given", async () => {
    // A valid base64 BoC (comment cell "50 Telegram Stars").
    const validBoc = "te6cckEBAQEAFwAAKgAAAAA1MCBUZWxlZ3JhbSBTdGFyc5fAhN4=";
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amountNano: "457100000",
      payloadCell: validBoc,
    });
    expect(res.ok).toBe(true);
    // the body forwarded to internal() is a parsed Cell object, not the raw string
    const lastCall = h.internal.mock.calls.at(-1)?.[0] as { body: unknown };
    expect(typeof lastCall.body).toBe("object");
    expect(lastCall.body).not.toBe(validBoc);
  });

  it("rejects an invalid payloadCell", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amountNano: "1",
      payloadCell: "not-a-valid-boc-cell",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
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
    expect(h.sendFile).not.toHaveBeenCalled();
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

describe("ton.wallet.getAddress", () => {
  it("derives friendly + raw address from the seed", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.getAddress();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.friendly).toBe("EQAsender_addr");
      expect(res.data.raw).toBe("0:sender_raw");
    }
  });

  it("requires a wallet seed", async () => {
    const client = new Fragment({ toncenterApiKey: "tc" });
    const res = await client.ton.wallet.getAddress();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });
});

describe("ton.wallet.getAccount", () => {
  it("derives the TonConnect account JSON from the seed", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.getAccount();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.address).toBe("0:sender_raw");
      expect(res.data.chain).toBe("-239");
      expect(res.data.publicKey).toBe("01".repeat(32));
      expect(typeof res.data.walletStateInit).toBe("string");
      expect(res.data.walletStateInit.length).toBeGreaterThan(0);
    }
  });

  it("requires a wallet seed", async () => {
    const client = new Fragment({ toncenterApiKey: "tc" });
    const res = await client.ton.wallet.getAccount();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });
});

describe("ton.wallet.v4r2.send — boc capture", () => {
  it("returns the external-message boc alongside the tx data", async () => {
    const client = fundedClient();
    const res = await client.ton.wallet.v4r2.send({
      destinationAddress: "UQdest",
      amount: 0.21,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(typeof res.data.boc).toBe("string");
      expect(res.data.boc.length).toBeGreaterThan(0);
    }
  });
});
