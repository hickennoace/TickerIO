import { describe, it, expect } from "vitest";
import { resolveSymbol } from "./symbol";

describe("resolveSymbol", () => {
  it("maps known crypto tickers to -USD pairs (UTC ref)", () => {
    const r = resolveSymbol("btc");
    expect(r.symbol).toBe("BTC-USD");
    expect(r.assetClass).toBe("crypto");
    expect(r.display).toBe("BTC");
    expect(r.refTz).toBe("UTC");
  });

  it("maps forex pairs to =X (UTC ref) with a slashed display", () => {
    const r = resolveSymbol("EURUSD");
    expect(r.symbol).toBe("EURUSD=X");
    expect(r.assetClass).toBe("forex");
    expect(r.display).toBe("EUR/USD");
  });

  it("accepts EUR/USD with a slash", () => {
    expect(resolveSymbol("EUR/USD").symbol).toBe("EURUSD=X");
  });

  it("maps index aliases", () => {
    expect(resolveSymbol("SPX").symbol).toBe("^GSPC");
    expect(resolveSymbol("NASDAQ").symbol).toBe("^IXIC");
    expect(resolveSymbol("SPX").assetClass).toBe("index");
  });

  it("passes equities through and defaults to NY tz", () => {
    const r = resolveSymbol("aapl");
    expect(r.symbol).toBe("AAPL");
    expect(r.assetClass).toBe("equity");
    expect(r.refTz).toBe("America/New_York");
  });

  it("passes explicit Yahoo crypto/forex forms through", () => {
    expect(resolveSymbol("ETH-USD").assetClass).toBe("crypto");
    expect(resolveSymbol("GBPJPY=X").assetClass).toBe("forex");
  });
});
