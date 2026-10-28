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
function isSameValueMutation(record) {
    if (record.type === "attributes") {
        const name = record.attributeName;
        if (!name)
            return false;
        if (SIDE_EFFECT_ATTRIBUTES.has(name))
            return false;
        const el = record.target;
        const current = el.getAttributeNS(record.attributeNamespace, name);
        return record.oldValue === current;
    }
    if (record.type === "characterData") {
        const node = record.target;
        return record.oldValue === node.data;
    }
    // childList: always capture (re-append reorders)
    return false;
}
/**
 * Observe `root` and invoke `onDirty(target)` for real visual changes.
 */
export function createMutationBridge(root, onDirty) {
    const stats = { ignored: 0, queued: 0 };
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
export function attachInputCaptures(root, onDirty, stats) {
    const handler = (event) => {
        const t = event.target;
        if (!t)
            return;
        if (t instanceof Element && t.hasAttribute("data-figment-skip-capture")) {
            return;
        }
        stats.inputCaptures += 1;
        onDirty(t);
    };
    const types = ["input", "focusin", "focusout"];
    for (const type of types) {
        root.addEventListener(type, handler, true);
    }
    return () => {
        for (const type of types) {
            root.removeEventListener(type, handler, true);
        }
    };
}
//# sourceMappingURL=mutations.js.map