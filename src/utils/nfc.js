// NFC tags beside QR codes (darkfactory ADR 0018 point 10).
//
// An NFC sticker holds one NDEF record: the same link a QR code holds. Any
// phone with NFC opens it without an app. Writing from a page needs Web NFC:
// Chrome on Android, on https. Elsewhere the page offers the link to copy
// into a writer app. A written tag is locked by default, so nobody can put
// another link on it; rebinding happens in the cloud, not on the sticker.

export const nfcAvailable = () => typeof window !== "undefined" && "NDEFReader" in window;

/** Write one URL record; with lock, make the tag read-only for good. */
export async function writeUrl(url, { lock = true, Reader = typeof window !== "undefined" ? window.NDEFReader : null } = {}) {
  if (!Reader) throw new Error("This browser cannot write NFC tags");
  const r = new Reader();
  await r.write({ records: [{ recordType: "url", data: url }] }, { overwrite: true });
  if (lock) await r.makeReadOnly();
}

/**
 * Read tags until stop() is called; onUrl gets each URL record on this
 * Portal's own origin. Anything else on a tag is ignored.
 */
export async function scanTags(onUrl, { origin = typeof window !== "undefined" ? window.location.origin : "", Reader = typeof window !== "undefined" ? window.NDEFReader : null } = {}) {
  if (!Reader) throw new Error("This browser cannot read NFC tags");
  const ctrl = new AbortController();
  const r = new Reader();
  r.onreading = (ev) => {
    for (const rec of ev.message?.records || []) {
      if (rec.recordType !== "url" && rec.recordType !== "absolute-url") continue;
      let url;
      try {
        url = new URL(new TextDecoder().decode(rec.data));
      } catch (e) {
        continue;
      }
      if (url.origin === origin && url.pathname.replace(/\/$/, "") === "/id") {
        onUrl(url);
        return;
      }
    }
  };
  await r.scan({ signal: ctrl.signal });
  return () => ctrl.abort();
}

/** The link as an SVG QR code that scales to its box. */
export async function qrSvg(url) {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
}

const SURVEY_KEY = "dhc.idc.surveyMode";
export const surveyModeOn = () => {
  try {
    return window.sessionStorage.getItem(SURVEY_KEY) === "1";
  } catch (e) {
    return false;
  }
};
export const setSurveyMode = (on) => {
  try {
    if (on) window.sessionStorage.setItem(SURVEY_KEY, "1");
    else window.sessionStorage.removeItem(SURVEY_KEY);
  } catch (e) {
    /* private window: survey mode lasts until the next page */
  }
};
