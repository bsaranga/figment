import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  createHost,
  FigmentUnsupportedError,
  type Host,
  type LayerHandle,
  VERSION,
} from "@figment/host";
import {
  attachNestedCanvas,
  FORM_HTML,
  FORM_ID,
  FORM_STYLE,
  PROFILE_LAYER_OPTS,
} from "../../shared/profile-form";

declare global {
  interface Window {
    __figment: { host: Host; framework: string };
  }
}

interface AppProps {
  stage: HTMLCanvasElement;
  statusEl: HTMLElement;
  logEl: HTMLElement;
}

export function App({ stage, statusEl, logEl }: AppProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const hostRef = useRef<Host | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form || hostRef.current) return;

    report(statusEl, "", `figment host ${VERSION} · React mounting…`);

    let host: Host;
    try {
      host = createHost(stage, { backend: "2d" });
    } catch (e) {
      if (e instanceof FigmentUnsupportedError) {
        report(statusEl, "err", `${e.reason}: ${e.message}`);
        throw e;
      }
      throw e;
    }

    attachNestedCanvas(form);
    host.mount(stage);
    const layer: LayerHandle = host.layer(form, {
      id: PROFILE_LAYER_OPTS.id,
      transform: { ...PROFILE_LAYER_OPTS.transform },
      drawAt: { ...PROFILE_LAYER_OPTS.drawAt },
    });
    hostRef.current = host;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const out = form.querySelector<HTMLOutputElement>("[data-testid=out]")!;
      const name = (
        form.querySelector("[data-testid=name]") as HTMLInputElement
      ).value;
      out.textContent = `Saved ${name}`;
      layer.invalidate();
    });

    report(statusEl, "ok", "host mounted · React owns the form DOM");
    logEl.textContent = JSON.stringify(host.state(), null, 2);
    window.__figment = { host, framework: "react" };
    setReady(true);

    return () => {
      layer.dispose();
      void host.destroy();
      hostRef.current = null;
    };
  }, [stage, statusEl, logEl]);

  void ready;

  // Portal into the canvas so the form is a drawable child (same as vanilla).
  return createPortal(
    <form
      ref={formRef}
      id={FORM_ID}
      style={cssTextToReactStyle(FORM_STYLE)}
      dangerouslySetInnerHTML={{ __html: FORM_HTML }}
    />,
    stage,
  );
}

function report(el: HTMLElement, kind: "ok" | "err" | "", text: string) {
  el.textContent = text;
  el.className = kind;
}

/** Inline CSS text → React style object (same declarations, same paint). */
function cssTextToReactStyle(cssText: string): CSSProperties {
  const style: Record<string, string> = {};
  for (const decl of cssText.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (!prop) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    style[camel] = value;
  }
  return style as CSSProperties;
}
