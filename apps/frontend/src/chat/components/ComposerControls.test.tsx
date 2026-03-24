import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChevronIcon from "./ChevronIcon";
import SendIcon from "./SendIcon";
import ComposerSendButton from "./ComposerSendButton";
import PickerButton from "./PickerButton";
import PickerMenu from "./PickerMenu";
import ModelPicker from "./ModelPicker";
import EffortPicker from "./EffortPicker";

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

  it("renders nothing when models is empty", () => {
    const markup = renderToStaticMarkup(
      <ModelPicker
        compact={false}
        isOpen={false}
        models={[]}
        onSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
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
        onSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
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
        onSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
        selectedModelId="gpt-4o"
      />,
    );

    expect(markup).toContain("gpt-4o");
    expect(markup).toContain("claude-3");
  });
});

describe("EffortPicker", () => {
  it("shows the trigger button with the selected effort label", () => {
    const markup = renderToStaticMarkup(
      <EffortPicker
        compact={false}
        efforts={["low", "medium", "high"]}
        isOpen={false}
        onSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
        selectedEffort="medium"
      />,
    );

    expect(markup).toContain("medium");
  });

  it("shows effort options in the dropdown when open", () => {
    const markup = renderToStaticMarkup(
      <EffortPicker
        compact={false}
        efforts={["low", "medium", "high"]}
        isOpen={true}
        onSelect={() => {}}
        onToggle={() => {}}
        positionClassName="left-0"
        selectedEffort="medium"
      />,
    );

    expect(markup).toContain("low");
    expect(markup).toContain("medium");
    expect(markup).toContain("high");
  });
});
