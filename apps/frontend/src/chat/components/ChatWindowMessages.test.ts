import { describe, expect, it } from "vitest";

import { getHistoryContentShellStyle } from "./ChatWindowMessages";

describe("getHistoryContentShellStyle", () => {
  it("returns an expanded shell style with height and opacity", () => {
    expect(getHistoryContentShellStyle(true, 240)).toMatchObject({
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
    expect(getHistoryContentShellStyle(false, 240)).toMatchObject({
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
