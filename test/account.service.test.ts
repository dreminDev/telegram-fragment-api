import { describe, expect, it } from "vitest";
import { parseProfile, parseSessions } from "../src/services/account.service.js";
import { createClient, expectOk } from "./helpers.js";

const PROFILE_HTML = `
<div class="tm-settings-item tm-settings-head-item">
  <img src="https://cdn/avatar.jpg" />
  <div class="tm-settings-item-head">Pavel Durov<span class="tm-badge-verified"></span></div>
  <div class="tm-settings-item-desc">@durov</div>
</div>
<div class="tm-settings-item icon-before icon-menu-wallet">
  <div class="tm-settings-item-desc">UQ_wallet_addr</div>
</div>`;

const SESSIONS_HTML = `
<div class="tm-header-action"><a class="btn"><span class="tm-button-label">@durov</span></a></div>
<div class="tm-header-button-photo"><img src="https://cdn/a.jpg" /></div>
<div class="tm-wallet">UQ_wallet_addr</div>
<script id="aj_script">var x = 1; Wallet.init({"address":"0:abc","ton_proof":"proof"});</script>
<table class="tm-table"><tbody>
  <tr>
    <td class="table-cell-value tm-value">Firefox, Windows</td>
    <td class="table-cell-status-thin">Current</td>
    <td class="table-cell-desc-col">Moscow</td>
    <td><time datetime="2026-06-16T10:00:00">now</time></td>
    <td><div class="tm-table-actions" data-session-id="sess_1"></div></td>
  </tr>
</tbody></table>`;

describe("parseProfile", () => {
  it("extracts name, username, avatar, verified and wallet", () => {
    const p = parseProfile(PROFILE_HTML);
    expect(p.name).toBe("Pavel Durov");
    expect(p.username).toBe("@durov");
    expect(p.avatar).toBe("https://cdn/avatar.jpg");
    expect(p.verified).toBe(true);
    expect(p.wallet).toBe("UQ_wallet_addr");
  });
});

describe("parseSessions", () => {
  it("extracts account info and session rows", () => {
    const s = parseSessions(SESSIONS_HTML);
    expect(s.account.username).toBe("@durov");
    expect(s.account.tonWallet).toBe("UQ_wallet_addr");
    expect(s.account["address"]).toBe("0:abc");
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0]).toMatchObject({
      device: "Firefox, Windows",
      status: "Current",
      location: "Moscow",
      sessionId: "sess_1",
    });
  });
});

describe("account.getProfile / getSessions", () => {
  it("fetches and parses the profile JSON payload", async () => {
    const { client, mock } = createClient();
    mock.onGet(/my\/profile/).reply(200, { h: PROFILE_HTML });
    const data = expectOk(await client.account.getProfile());
    expect(data.username).toBe("@durov");
  });

  it("fetches and parses the sessions page", async () => {
    const { client, mock } = createClient();
    mock.onGet(/my\/sessions/).reply(200, SESSIONS_HTML);
    const data = expectOk(await client.account.getSessions());
    expect(data.sessions).toHaveLength(1);
    expect(data.account.username).toBe("@durov");
  });
});
