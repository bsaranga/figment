import { expect, test } from "@playwright/test";

/**
 * M4e acceptance: glass command palette with ⌘K, filter, keyboard nav.
 * Usable on canvas — real input + listbox semantics.
 */

test.describe("M4e command palette", () => {
  test("⌘K opens, filters, arrows select, Enter runs", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerCommandPalette();

      const pal = document.createElement("figment-command-palette") as HTMLElement & {
        setCommands: (l: unknown[]) => void;
        open: () => void;
        close: () => void;
        toggle: () => void;
        isOpen: boolean;
        selectedCommand: () => { id: string; label: string } | null;
        confirm: () => { id: string; label: string } | null;
      };
      document.body.append(pal);
      pal.setCommands([
        { id: "new", label: "New board", shortcut: "⌘N" },
        { id: "open", label: "Open project", hint: "recent" },
        { id: "export", label: "Export PNG" },
      ]);

      const events: string[] = [];
      pal.addEventListener("figment-command", (e) => {
        events.push((e as CustomEvent).detail.id);
      });

      // ⌘K opens
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
      );
      const opened = pal.isOpen;
      const hasOpenAttr = pal.hasAttribute("open");

      // Type filter
      const input = pal.shadowRoot!.querySelector("input") as HTMLInputElement;
      input.value = "ex";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const filtered = pal.selectedCommand()?.id;

      // Arrow down / up on unfiltered list
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      const second = pal.selectedCommand()?.id;
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
      );
      const first = pal.selectedCommand()?.id;

      // Enter runs
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      const confirmed = pal.isOpen;

      // Reopen and Escape closes
      pal.open();
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      const escaped = pal.isOpen;

      // Glass style present on panel
      const panel = pal.shadowRoot!.querySelector(".panel") as HTMLElement;
      const glass = getComputedStyle(panel).backdropFilter;

      pal.remove();
      return {
        opened,
        hasOpenAttr,
        filtered,
        second,
        first,
        stillOpenAfterEnter: confirmed,
        escaped,
        events,
        glass,
      };
    });

    expect(result.opened).toBe(true);
    expect(result.hasOpenAttr).toBe(true);
    expect(result.filtered).toBe("export");
    expect(result.second).toBe("open");
    expect(result.first).toBe("new");
    expect(result.stillOpenAfterEnter).toBe(false);
    expect(result.escaped).toBe(false);
    expect(result.events).toContain("new");
    expect(result.glass).toBeTruthy();
  });

  test("registerCommandPalette is exported", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      return typeof ui.registerCommandPalette === "function";
    });
    expect(ok).toBe(true);
  });
});
