/**
 * Mutation filtering + non-mutation paint sources (input/focus).
 * Same-value writes are ignored; side-effect attributes always recapture.
 */

export const SIDE_EFFECT_ATTRIBUTES = new Set([
  "src",
  "srcset",
  "srcdoc",
  "href",
  "poster",
  // canvas bitmap clears on every width/height set, even to the same value
  "width",
  "height",
]);

export interface MutationFilterStats {
  ignored: number;
  queued: number;
}

function isSameValueMutation(record: MutationRecord): boolean {
  if (record.type === "attributes") {
    const name = record.attributeName;
    if (!name) return false;
    if (SIDE_EFFECT_ATTRIBUTES.has(name)) return false;
    const el = record.target as Element;
    const current = el.getAttributeNS(record.attributeNamespace, name);
    return record.oldValue === current;
  }
  if (record.type === "characterData") {
    const node = record.target as CharacterData;
    return record.oldValue === node.data;
  }
  // childList: always capture (re-append reorders)
  return false;
}

export interface MutationBridge {
  observer: MutationObserver;
  stop(): void;
  stats: MutationFilterStats;
}

/**
 * Observe `root` and invoke `onDirty(target)` for real visual changes.
 */
export function createMutationBridge(
  root: ParentNode,
  onDirty: (target: Node) => void,
): MutationBridge {
  const stats: MutationFilterStats = { ignored: 0, queued: 0 };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (isSameValueMutation(record)) {
        stats.ignored += 1;
        continue;
      }
      stats.queued += 1;
      onDirty(record.target);
    }
  });

  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
    attributeOldValue: true,
    characterDataOldValue: true,
  });

  return {
    observer,
    stats,
    stop() {
      observer.disconnect();
    },
  };
}

/**
 * Input value changes are not DOM mutations (slider thumb, typing into value).
 * Queue a capture on `input` / `focusin` / `focusout`.
 * Opt-out via `data-figment-skip-capture` on the event target.
 */
export function attachInputCaptures(
  root: ParentNode,
  onDirty: (target: Node) => void,
  stats: { inputCaptures: number },
): () => void {
  const handler = (event: Event) => {
    const t = event.target as Element | null;
    if (!t) return;
    if (t instanceof Element && t.hasAttribute("data-figment-skip-capture")) {
      return;
    }
    stats.inputCaptures += 1;
    onDirty(t);
  };

  const types = ["input", "focusin", "focusout"] as const;
  for (const type of types) {
    root.addEventListener(type, handler, true);
  }
  return () => {
    for (const type of types) {
      root.removeEventListener(type, handler, true);
    }
  };
}
