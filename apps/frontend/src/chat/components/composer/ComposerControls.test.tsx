import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ChatModelOption } from "../../../types";
import ChevronIcon from "../shared/ChevronIcon";
import SendIcon from "../shared/SendIcon";
import ComposerSendButton from "./ComposerSendButton";
import PickerButton from "./PickerButton";
import PickerMenu from "./PickerMenu";
import ModelPicker, { getEffortLabel } from "./ModelPicker";

describe("ChevronIcon", () => {
  it("renders an aria-hidden SVG", () => {
    const markup = renderToStaticMarkup(<ChevronIcon className="h-4 w-4" />);

    expect(markup).toContain("aria-hidden");
    expect(markup).toContain("<svg");
    expect(markup).toContain("h-4 w-4");
  });
});

describe("SendIcon", () => {
  it("renders an aria-hidden SVG", () => {
    const markup = renderToStaticMarkup(<SendIcon className="h-5 w-5" />);

    expect(markup).toContain("aria-hidden");
    expect(markup).toContain("<svg");
    expect(markup).toContain("h-5 w-5");
  });
});

describe("ComposerSendButton", () => {
  it("renders with the Button data-slot attribute", () => {
    const markup = renderToStaticMarkup(
      <ComposerSendButton compact={false} onClick={() => {}} />,
    );

    expect(markup).toContain('data-slot="button"');
    expect(markup).toContain('aria-label="Send message"');
  });

  it("uses compact sizing when compact is true", () => {
    const markup = renderToStaticMarkup(
      <ComposerSendButton compact={true} onClick={() => {}} />,
    );

    expect(markup).toContain("h-9 w-9");
  });

  it("uses large sizing when compact is false", () => {
    const markup = renderToStaticMarkup(
      <ComposerSendButton compact={false} onClick={() => {}} />,
    );

    expect(markup).toContain("h-12 w-12");
  });
});

describe("PickerButton", () => {
  it("renders with the Button data-slot and shows the label", () => {
    const markup = renderToStaticMarkup(
      <PickerButton
        compact={false}
        isOpen={false}
        label="gpt-4o"
        onClick={() => {}}
      />,
    );

    expect(markup).toContain('data-slot="button"');
    expect(markup).toContain("gpt-4o");
  });

  it("rotates the chevron when open", () => {
    const markup = renderToStaticMarkup(
      <PickerButton
        compact={false}
        isOpen={true}
        label="gpt-4o"
        onClick={() => {}}
      />,
    );

    expect(markup).toContain("rotate-180");
  });

  it("does not rotate the chevron when closed", () => {
    const markup = renderToStaticMarkup(
      <PickerButton
        compact={false}
        isOpen={false}
        label="gpt-4o"
        onClick={() => {}}
      />,
    );

    expect(markup).not.toContain("rotate-180");
  });

  it("uses compact sizing classes when compact", () => {
    const markup = renderToStaticMarkup(
      <PickerButton
        compact={true}
        isOpen={false}
        label="gpt-4o"
        onClick={() => {}}
      />,
    );

    expect(markup).toContain("h-8");
    expect(markup).toContain("text-xs");
  });
});

describe("PickerMenu", () => {
  const options = [
    { id: "gpt-4o", label: "gpt-4o" },
    { id: "claude-3", label: "claude-3" },
  ];

  it("renders all options", () => {
    const markup = renderToStaticMarkup(
      <PickerMenu
        compact={false}
        onSelect={() => {}}
        options={options}
        positionClassName="left-0"
        selectedId="gpt-4o"
      />,
    );

    expect(markup).toContain("gpt-4o");
    expect(markup).toContain("claude-3");
  });

  it("marks the selected option with the selected className", () => {
    const markup = renderToStaticMarkup(
      <PickerMenu
        compact={false}
        onSelect={() => {}}
        options={options}
        positionClassName="left-0"
        selectedId="gpt-4o"
      />,
    );

    expect(markup).toContain("font-medium");
  });
});

describe("ModelPicker", () => {
  const models = [
    { id: "gpt-4o", efforts: [], defaultEffort: null },
    { id: "claude-3", efforts: [], defaultEffort: null },
  ];

  const modelsWithEfforts: ChatModelOption[] = [
    {
      id: "gpt-5",
      efforts: ["low", "medium", "high"],
      defaultEffort: "medium",
    },
  ];

  it("renders nothing when models is empty", () => {
    const markup = renderToStaticMarkup(
      <ModelPicker
        compact={false}
        isOpen={false}
        models={[]}
        onModelEffortSelect={() => {}}
        onModelRowSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
        selectedEffort={null}
        selectedModelId=""
      />,
    );

    expect(markup).toBe("");
  });

  it("shows the trigger button with the selected model name", () => {
    const markup = renderToStaticMarkup(
      <ModelPicker
        compact={false}
        isOpen={false}
        models={models}
        onModelEffortSelect={() => {}}
        onModelRowSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
        selectedEffort={null}
        selectedModelId="gpt-4o"
      />,
    );

    expect(markup).toContain("gpt-4o");
    expect(markup).not.toContain("claude-3");
  });

  it("shows the dropdown menu when open", () => {
    const markup = renderToStaticMarkup(
      <ModelPicker
        compact={false}
        isOpen={true}
        models={models}
        onModelEffortSelect={() => {}}
        onModelRowSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
        selectedEffort={null}
        selectedModelId="gpt-4o"
      />,
    );

    expect(markup).toContain("gpt-4o");
    expect(markup).toContain("claude-3");
  });

  it("shows a submenu affordance for models that support effort", () => {
    const markup = renderToStaticMarkup(
      <ModelPicker
        compact={false}
        isOpen={true}
        models={modelsWithEfforts}
        onModelEffortSelect={() => {}}
        onModelRowSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
        selectedEffort="medium"
        selectedModelId="gpt-5"
      />,
    );

    expect(markup).toContain("gpt-5");
    expect(markup).toContain("rotate-[-90deg]");
  });
});

describe("getEffortLabel", () => {
  it("returns a visible label for none so the effort menu does not list a blank row", () => {
    expect(getEffortLabel("none")).toBe("None");
  });

  it("returns the effort id for other levels", () => {
    expect(getEffortLabel("medium")).toBe("medium");
  });
});
