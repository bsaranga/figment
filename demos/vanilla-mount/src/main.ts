import {
  createHost,
  FigmentUnsupportedError,
  type Host,
  VERSION,
} from "@figment/host";

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
form.id = "profile";
form.style.cssText = [
  "display:flex",
  "flex-direction:column",
  "gap:10px",
  "width:280px",
  "padding:16px",
  "background:#1b2230",
  "color:#e8ecf4",
  "border-radius:12px",
  "font:14px system-ui",
  "box-sizing:border-box",
].join(";");

form.innerHTML = `
  <strong>Profile</strong>
  <label>Name <input name="name" value="Ada" data-testid="name" style="width:100%" /></label>
  <label>Bio <textarea name="bio" rows="2" data-testid="bio" style="width:100%">Hello</textarea></label>
  <button type="submit" data-testid="save">Save</button>
  <output data-testid="out"></output>
`;

// Nested canvas to exercise M1c mark/restore
const nested = document.createElement("canvas");
nested.width = 80;
nested.height = 40;
nested.style.cssText = "width:80px;height:40px;background:#c23f53;border-radius:6px";
form.append(nested);

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

host.mount(stage);

const layer = host.layer(form, {
  id: "profile",
  transform: { x: 24, y: 24 },
  drawAt: { x: 24, y: 24 },
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const out = form.querySelector<HTMLOutputElement>("[data-testid=out]")!;
  const name = (form.querySelector("[data-testid=name]") as HTMLInputElement).value;
  out.textContent = `Saved ${name}`;
  layer.invalidate();
});

report("ok", "host mounted · interact with the form inside the canvas");
dumpState(host);

// Expose for Playwright
declare global {
  interface Window {
    __figment: { host: Host };
  }
}
window.__figment = { host };
