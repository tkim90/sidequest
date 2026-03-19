import { describe, expect, it } from "vitest";

import { getDisclosureContentShellStyle } from "./CollapsibleDisclosure";

describe("getDisclosureContentShellStyle", () => {
  it("returns an expanded shell style with height and opacity", () => {
    expect(getDisclosureContentShellStyle(true, 240)).toMatchObject({
      height: 240,
      marginTop: 16,
      opacity: 1,
      overflow: "hidden",
      pointerEvents: "auto",
      transitionDuration: "260ms",
      transitionProperty: "height, opacity, margin-top",
    });
  });

  it("returns a collapsed shell style that hides content but keeps it mounted", () => {
    expect(getDisclosureContentShellStyle(false, 240)).toMatchObject({
      height: 0,
      marginTop: 0,
      opacity: 0,
      overflow: "hidden",
      pointerEvents: "none",
      transitionDuration: "260ms",
      transitionProperty: "height, opacity, margin-top",
    });
  });
});
