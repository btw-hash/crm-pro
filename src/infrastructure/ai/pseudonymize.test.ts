import { describe, expect, it } from "vitest";
import { pseudonymize } from "./pseudonymize";

describe("pseudonymize", () => {
  it("masks a phone number and restores it back", () => {
    const { text, restore } = pseudonymize(
      "Call the technologist at +1 (212) 555-0134 about the test.",
    );
    expect(text).toContain("[PHONE_1]");
    expect(text).not.toContain("555-0134");
    expect(restore(`Call back [PHONE_1]`)).toContain("+1 (212) 555-0134");
  });

  it("masks TWO phone numbers back to back separated by a space (doesn't merge them into one run)", () => {
    const { text } = pseudonymize("Contacts: 2125551234 3105557890");
    expect(text).toBe("Contacts: [PHONE_1] [PHONE_2]");
  });

  it("leaves short numbers (temperature/time/dosage) and barcodes alone", () => {
    const { text } = pseudonymize(
      "Baked at 180 degrees for 15 minutes, dosage 12%, barcode 5410291001234.",
    );
    expect(text).toBe("Baked at 180 degrees for 15 minutes, dosage 12%, barcode 5410291001234.");
  });

  it("masks a known full name on an exact match", () => {
    const { text, restore } = pseudonymize("The technologist Marina Foster is satisfied.", [
      "Marina Foster",
    ]);
    expect(text).toBe("The technologist [CONTACT_1] is satisfied.");
    expect(restore(text)).toBe("The technologist Marina Foster is satisfied.");
  });

  it("returns the text unchanged when there's no PII", () => {
    const input = "The Coverlux Cover glaze didn't run, the test succeeded.";
    expect(pseudonymize(input).text).toBe(input);
  });

  // --- #282: full names in possessive/plural form don't leak ---

  it("masks a full name in possessive form", () => {
    // "Marina Foster's" — possessive form of the full name from knownContacts.
    const { text, restore } = pseudonymize("We handed the samples to Marina Foster's team.", [
      "Marina Foster",
    ]);
    expect(text).not.toContain("Marina");
    expect(text).not.toContain("Foster");
    // round-trip restores the original text without loss
    expect(restore(text)).toBe("We handed the samples to Marina Foster's team.");
  });

  it("masks a separate last name and first name from a contact (partial mention)", () => {
    const { text } = pseudonymize("Foster promised, and Marina will call back.", ["Marina Foster"]);
    expect(text).not.toContain("Foster");
    expect(text).not.toContain("Marina");
  });

  it("masks a possessive last name on its own", () => {
    const { text } = pseudonymize("The documents were signed at Foster's yesterday.", [
      "Marina Foster",
    ]);
    expect(text).not.toContain("Foster");
  });

  it("masks a three-part full name (first/middle/last) and its possessive forms", () => {
    const { text } = pseudonymize("Called Richard Allen Bennett about the delivery.", [
      "Richard Allen Bennett",
    ]);
    expect(text).not.toContain("Richard");
    expect(text).not.toContain("Allen");
    expect(text).not.toContain("Bennett");
  });

  it("doesn't mask short/common tokens from a name (no false hits by substring)", () => {
    // "Al"/"Wu" are shorter than MIN_NAME_TOKEN_LEN, so they're never masked, even
    // though a contact with such a name exists — they shouldn't wipe out "Albany".
    const { text } = pseudonymize("Delivery to the Albany warehouse.", ["Al Wu"]);
    expect(text).toBe("Delivery to the Albany warehouse.");
  });

  it("doesn't mask a name component as part of another word (letter boundaries)", () => {
    // "Marina" must not catch "marinade".
    const { text } = pseudonymize("We ordered marinade for the test.", ["Marina Foster"]);
    expect(text).toBe("We ordered marinade for the test.");
  });

  // --- #296: a tax ID isn't masked as a phone number ---

  it("a 10-digit company tax ID isn't masked as a phone when given via the knownTaxIds list", () => {
    const { text, restore } = pseudonymize(
      "Client tax ID 7707083893, shipment tomorrow.",
      [],
      ["7707083893"],
    );
    expect(text).toContain("7707083893"); // the tax ID reached the model unchanged
    expect(text).not.toContain("[PHONE");
    expect(restore(text)).toBe("Client tax ID 7707083893, shipment tomorrow.");
  });

  it("a 12-digit sole-proprietor tax ID isn't masked as a phone (regex is bounded to a 10-digit body)", () => {
    const { text } = pseudonymize("Sole proprietor tax ID 770708389312 on the contract.");
    expect(text).toBe("Sole proprietor tax ID 770708389312 on the contract.");
  });

  it("a 12-digit tax ID given via the list is also left untouched", () => {
    const { text } = pseudonymize("Reference: 500100732259.", [], ["500100732259"]);
    expect(text).toContain("500100732259");
    expect(text).not.toContain("[PHONE");
  });

  it("a real phone number is still masked, even when a tax-ID list is supplied", () => {
    const { text } = pseudonymize(
      "Tax ID 7707083893, phone +1 (212) 555-0134.",
      [],
      ["7707083893"],
    );
    expect(text).toContain("7707083893"); // the tax ID stayed intact
    expect(text).toContain("[PHONE_1]"); // the phone number was masked
    expect(text).not.toContain("555-0134");
  });

  it("a tax ID and a phone number sharing the same body: the tax-ID list protects the tax ID, the phone still gets caught", () => {
    // the body 9991234567 shows up both as a "tax ID" and as a phone number
    const { text } = pseudonymize(
      "Tax ID 9991234567 and a call at 999-123-4567.",
      [],
      ["9991234567"],
    );
    expect(text).toContain("9991234567");
    expect(text).toContain("[PHONE_1]");
  });
});
