import { expect, test } from "@playwright/test";

/**
 * M5b acceptance: form controls keep native keyboard + IME semantics.
 */

test.describe("M5b form controls", () => {
  test("input / select / slider / checkbox stay native", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });

    const result = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      ui.registerFormControls();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <figment-input id="in"><span slot="label">Name</span></figment-input>
        <figment-select id="sel"><span slot="label">Theme</span>
          <option value="a">A</option>
          <option value="b">B</option>
        </figment-select>
        <figment-slider id="sl"></figment-slider>
        <figment-checkbox id="ck"><span slot="label">Enable</span></figment-checkbox>
      `;
      document.body.append(wrap);

      const input = document.getElementById("in") as HTMLElement & {
        control: HTMLInputElement;
        value: string;
        focus: () => void;
      };
      const select = document.getElementById("sel") as HTMLElement & {
        control: HTMLSelectElement;
        value: string;
      };
      const slider = document.getElementById("sl") as HTMLElement & {
        control: HTMLInputElement;
        value: number;
      };
      const box = document.getElementById("ck") as HTMLElement & {
        control: HTMLInputElement;
        checked: boolean;
      };

      // Native tags under the hood (IME / keyboard contract).
      const tags = {
        input: input.control.tagName,
        select: select.control.tagName,
        slider: slider.control.type,
        box: box.control.type,
      };

      // Keyboard: type into input (native selection APIs).
      input.focus();
      input.control.value = "Ada";
      input.control.dispatchEvent(new Event("input", { bubbles: true }));
      const val = input.value;

      // IME composition events surface on the native control.
      let ime = false;
      input.control.addEventListener("compositionstart", () => {
        ime = true;
      });
      input.control.dispatchEvent(new CompositionEvent("compositionstart"));
      const imeFlag = input.hasAttribute("data-ime");

      select.control.value = "b";
      select.control.dispatchEvent(new Event("change", { bubbles: true }));
      const selVal = select.value;

      slider.control.value = "42";
      slider.control.dispatchEvent(new Event("input", { bubbles: true }));
      const slVal = slider.value;

      box.control.checked = true;
      box.control.dispatchEvent(new Event("change", { bubbles: true }));
      const ck = box.checked;

      wrap.remove();
      return {
        tags,
        val,
        ime,
        imeFlag,
        selVal,
        slVal,
        ck,
        focused: document.activeElement === input.control || input.control === document.activeElement,
      };
    });

    expect(result.tags.input).toBe("INPUT");
    expect(result.tags.select).toBe("SELECT");
    expect(result.tags.slider).toBe("range");
    expect(result.tags.box).toBe("checkbox");
    expect(result.val).toBe("Ada");
    expect(result.ime).toBe(true);
    expect(result.imeFlag).toBe(true);
    expect(result.selVal).toBe("b");
    expect(result.slVal).toBe(42);
    expect(result.ck).toBe(true);
  });

  test("registerFormControls is exported", async ({ page }) => {
    await page.goto("/admission-probe.html");
    await expect(page.locator("#out")).toHaveAttribute("data-ok", "yes", {
      timeout: 10_000,
    });
    const ok = await page.evaluate(async () => {
      const ui = await import(
        "/@fs/Users/bsaranga/projects/figment/packages/ui/src/index.ts"
      );
      return typeof ui.registerFormControls === "function";
    });
    expect(ok).toBe(true);
  });
});
