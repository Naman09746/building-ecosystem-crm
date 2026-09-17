import { describe, it, expect } from "vitest";
import { actionCardProps } from "@repo/ui/components/action-card";

function makeEvent(key: string) {
  return {
    key,
    preventDefault: () => {},
  } as unknown as React.KeyboardEvent;
}

describe("actionCardProps (keyboard-accessible clickable cards)", () => {
  it("exposes button semantics for screen readers and tab order", () => {
    const props = actionCardProps(() => {}, "Open lead X");
    expect(props.role).toBe("button");
    expect(props.tabIndex).toBe(0);
    expect(props["aria-label"]).toBe("Open lead X");
  });

  it("activates on Enter and Space with preventDefault", () => {
    let activated = 0;
    const props = actionCardProps(() => activated++, "card");

    props.onKeyDown(makeEvent("Enter"));
    expect(activated).toBe(1);

    props.onKeyDown(makeEvent(" "));
    expect(activated).toBe(2);
  });

  it("ignores other keys", () => {
    let activated = 0;
    const props = actionCardProps(() => activated++, "card");
    props.onKeyDown(makeEvent("Tab"));
    props.onKeyDown(makeEvent("Escape"));
    props.onKeyDown(makeEvent("a"));
    expect(activated).toBe(0);
  });
});
