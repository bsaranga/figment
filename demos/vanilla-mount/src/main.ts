import { createHost, FigmentUnsupportedError, VERSION } from "@figment/host";

const status = document.querySelector<HTMLDivElement>("#status")!;
const stage = document.querySelector<HTMLCanvasElement>("#stage")!;

function report(kind: "ok" | "err" | "", text: string) {
  status.textContent = text;
  status.className = kind;
}

report("", `figment host ${VERSION} · probing…`);

// Structural probe first (M1 will add functional probes).
const structural = stage.content === "drawable";

if (!structural) {
  report(
    "err",
    "HTML-in-Canvas not available. Use Chrome Canary with flags (see ACTIVATION.md) or Chrome 157+.",
  );
} else {
  report("ok", "HTML-in-Canvas detected · host mount arrives in M1");
  try {
    createHost(stage, { backend: "2d" });
  } catch (e) {
    if (e instanceof FigmentUnsupportedError) {
      report("err", `${e.reason}: ${e.message}`);
    } else {
      throw e;
    }
  }
}
