import { describe, expect, it } from "vitest";
import { Fragment } from "../src/Fragment.js";
import {
  AccountService,
  AuthService,
  PremiumService,
  StarsService,
  TonService,
  UsersService,
  UtilsService,
} from "../src/index.js";

describe("Fragment client", () => {
  it("wires up every service namespace", () => {
    const client = new Fragment();
    expect(client.auth).toBeInstanceOf(AuthService);
    expect(client.users).toBeInstanceOf(UsersService);
    expect(client.utils).toBeInstanceOf(UtilsService);
    expect(client.stars).toBeInstanceOf(StarsService);
    expect(client.premium).toBeInstanceOf(PremiumService);
    expect(client.ton).toBeInstanceOf(TonService);
    expect(client.account).toBeInstanceOf(AccountService);
    expect(typeof client.ton.wallet.getBalance).toBe("function");
    expect(typeof client.ton.wallet.v4r2.send).toBe("function");
  });

  it("defaults stelDt and exposes credentials snapshot", () => {
    const client = new Fragment({ hash: "h" });
    const creds = client.getCredentials();
    expect(creds.hash).toBe("h");
    expect(creds.stelDt).toBe("-180");
  });

  it("configure() merges credentials and is chainable", () => {
    const client = new Fragment();
    const returned = client.configure({ hash: "new" }).configure({ stelSsid: "s" });
    expect(returned).toBe(client);
    expect(client.getCredentials().hash).toBe("new");
    expect(client.getCredentials().stelSsid).toBe("s");
  });

  it("keeps two clients isolated", () => {
    const a = new Fragment({ hash: "a" });
    const b = new Fragment({ hash: "b" });
    expect(a.getCredentials().hash).toBe("a");
    expect(b.getCredentials().hash).toBe("b");
  });
});
