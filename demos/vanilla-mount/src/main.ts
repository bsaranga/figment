import {
  createHost,
  FigmentUnsupportedError,
  type Host,
  VERSION,
} from "@figment/host";
import {
  attachNestedCanvas,
  FORM_HTML,
  FORM_ID,
  FORM_STYLE,
  PROFILE_LAYER_OPTS,
} from "../../shared/profile-form";

const status = document.querySelector<HTMLDivElement>("#status")!;
const stage = document.querySelector<HTMLCanvasElement>("#stage")!;
const log = document.querySelector<HTMLPreElement>("#log")!;

function report(kind: "ok" | "err" | "", text: string) {
  status.textContent = text;
  status.className = kind;
}

function dumpState(host: Host) {
  const s = host.state();
  log.textContent = JSON.stringify(s, null, 2);
  return s;
}

report("", `figment host ${VERSION} · mounting…`);

// App DOM (any framework could own this tree)
const form = document.createElement("form");
form.id = FORM_ID;
form.style.cssText = FORM_STYLE;
form.innerHTML = FORM_HTML;

// Nested canvas to exercise M1c mark/restore
attachNestedCanvas(form);

stage.append(form);

let host: Host;
try {
  host = createHost(stage, { backend: "2d" });
} catch (e) {
  if (e instanceof FigmentUnsupportedError) {
    report("err", `${e.reason}: ${e.message}`);
    throw e;
  }
  throw e;
}

try {
  await host.admit();
} catch (e) {
  if (e instanceof FigmentUnsupportedError) {
    report("err", `${e.reason}: ${e.message}`);
    throw e;
  }
  throw e;
}

host.mount(stage);

const layer = host.layer(form, {
  id: PROFILE_LAYER_OPTS.id,
  transform: { ...PROFILE_LAYER_OPTS.transform },
  drawAt: { ...PROFILE_LAYER_OPTS.drawAt },
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const out = form.querySelector<HTMLOutputElement>("[data-testid=out]")!;
  const name = (form.querySelector("[data-testid=name]") as HTMLInputElement)
    .value;
  out.textContent = `Saved ${name}`;
  layer.invalidate();
});

// Wait for the first complete frame before claiming "ok" (M2c seamless).
await host.paintOnce();
report("ok", "host mounted · interact with the form inside the canvas");
dumpState(host);

// Expose for Playwright
declare global {
  interface Window {
    __figment: { host: Host; framework?: string };
  }
}
window.__figment = { host, framework: "vanilla" };
