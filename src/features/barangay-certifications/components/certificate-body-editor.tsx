"use client";

import { useMemo } from "react";

import dynamic from "next/dynamic";

/**
 * Jodit reaches for `window` as it loads, so it is pulled in on the client only.
 * The placeholder keeps the page from jumping while the editor arrives.
 */
const JoditEditor = dynamic(() => import("jodit-react"), {
  ssr: false,
  loading: () => <div className="template-editor-loading">Loading the layout editor…</div>,
});

export function CertificateBodyEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (next: string) => void;
  /** View mode: the layout is shown with the toolbar hidden. */
  readOnly?: boolean;
}) {
  const config = useMemo(
    () => ({
      readonly: readOnly,
      toolbar: !readOnly,
      // The layout grows with its content so the page scrolls once, instead of
      // the document scrolling inside a fixed-height box.
      height: "auto",
      minHeight: readOnly ? 200 : 420,
      allowResizeX: false,
      allowResizeY: false,
      // `statusbar: false` alone still leaves the counters and the branding
      // line, so each one is turned off explicitly.
      statusbar: false,
      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
      // There is no upload endpoint in this prototype, so an attached image is
      // embedded in the layout itself rather than posted somewhere.
      uploader: { insertImageAsBase64URI: true },
      placeholder: "Compose the printable certificate layout…",
    }),
    [readOnly],
  );

  return (
    <div className="template-editor" data-readonly={readOnly ? "" : undefined}>
      <JoditEditor value={value} config={config} onBlur={(next) => onChange?.(next)} />
    </div>
  );
}
