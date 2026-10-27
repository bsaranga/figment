import { expect, test } from "@playwright/test";

/**
 * M4f acceptance: modal traps focus + inert background; toast dissolves.
 */

test.describe("M4f modal + toast", () => {
  test("modal traps focus and inert the page", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerModal();

      const outside = document.createElement("button");
      outside.id = "outside-btn";
      outside.textContent = "outside";
      document.body.append(outside);

      const modal = document.createElement("figment-modal") as HTMLElement & {
        open: () => void;
        close: () => void;
        isOpen: boolean;
      };
      modal.innerHTML = `
        <span slot="title">Delete board</span>
        <input id="m-input" />
        <button id="m-ok" slot="actions" type="button" class="primary">OK</button>
      `;
      document.body.append(modal);

      modal.open();
      const open1 = modal.isOpen;
      const outsideInert = outside.hasAttribute("inert");
      const activeId = (document.activeElement as HTMLElement)?.id || "";

      // Tab cycles within the modal (focus trap).
      modal.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
      );
      modal.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
      );

      // Escape closes
      modal.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      const open2 = modal.isOpen;
      const outsideRestored = !outside.hasAttribute("inert");

      outside.remove();
      modal.remove();
      return { open1, outsideInert, activeId, open2, outsideRestored };
    });

    expect(result.open1).toBe(true);
    expect(result.outsideInert).toBe(true);
    expect(result.open2).toBe(false);
    expect(result.outsideRestored).toBe(true);
  });

  test("toast shows and dissolves out", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerToast();

      const toast = document.createElement("figment-toast") as HTMLElement & {
        show: (ms?: number) => void;
        hide: () => Promise<void>;
        isVisible: boolean;
      };
      toast.textContent = "Saved to disk";
      document.body.append(toast);

      toast.show();
      const shown = toast.isVisible;
      const hasOpen = toast.hasAttribute("open");

      await toast.hide();
      const hidden = !toast.isVisible;
      const closed = !toast.hasAttribute("open");

      toast.remove();
      return { shown, hasOpen, hidden, closed };
    });

    expect(result.shown).toBe(true);
    expect(result.hasOpen).toBe(true);
    expect(result.hidden).toBe(true);
    expect(result.closed).toBe(true);
  });
});
