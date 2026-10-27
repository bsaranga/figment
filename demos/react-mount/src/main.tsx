import { createRoot } from "react-dom/client";
import { App } from "./App";

const stage = document.querySelector<HTMLCanvasElement>("#stage")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;
const logEl = document.querySelector<HTMLPreElement>("#log")!;
const rootEl = document.querySelector<HTMLDivElement>("#root")!;

createRoot(rootEl).render(
  <App stage={stage} statusEl={statusEl} logEl={logEl} />,
);
