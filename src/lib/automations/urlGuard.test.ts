import { describe, expect, it } from "vitest";
import { validateAutomationUrl } from "./run.server";

describe("validateAutomationUrl", () => {
  const blocked = [
    "http://localhost/",
    "http://127.0.0.1/hook",
    "http://10.0.0.5/",
    "http://192.168.1.10/",
    "http://172.16.0.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://100.64.0.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[fc00::1]/",
    "http://[fe80::1]/",
    "http://hub.internal/",
    "http://hub.local/",
    "ftp://exemplo.com/",
  ];
  for (const url of blocked) {
    it(`bloqueia ${url}`, () => {
      expect(validateAutomationUrl(url).ok).toBe(false);
    });
  }

  const allowed = ["https://exemplo.com/webhook", "http://203.0.113.10/hook", "https://[2001:db8::1]/"];
  for (const url of allowed) {
    it(`permite ${url}`, () => {
      expect(validateAutomationUrl(url).ok).toBe(true);
    });
  }
});
