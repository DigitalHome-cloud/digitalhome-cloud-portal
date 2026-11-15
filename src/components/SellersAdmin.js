import React, { useState } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import {
  createSeller,
  sellerEditors,
  addSellerEditor,
  removeSellerEditor,
  importDeviceCatalogue,
  PLATFORM_SELLER,
} from "../utils/market";

const KINDS = ["manufacturer", "distributor", "wholesaler", "platform"];
const ID_RE = /^[a-z][a-z0-9-]{1,39}$/;
const errText = (err) =>
  err?.errors?.[0]?.message || err?.message || String(err);

/**
 * dhc-admins: the marketplace's sellers. Create one (id, name, kind), name its
 * editors by e-mail (they join group market-<id> and need an authenticator
 * app to edit), and once per environment bring the old Catalog (DeviceModel)
 * in as seller digitalhome-cloud. Every call needs the admin's TOTP session;
 * the market Lambda checks it.
 */
const SellersAdmin = ({ sellers, onChanged }) => {
  const { t } = useTranslation();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("manufacturer");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(null); // seller id whose editors show
  const [editors, setEditors] = useState([]);
  const [email, setEmail] = useState("");

  const run = async (fn) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      await createSeller(id.trim(), name.trim(), kind);
      setMsg(t("market.created", { id, defaultValue: `Seller ${id} created.` }));
      setId("");
      setName("");
      await onChanged();
    });
  };

  const showEditors = (sid) =>
    run(async () => {
      if (open === sid) {
        setOpen(null);
        return;
      }
      setEditors(await sellerEditors(sid));
      setOpen(sid);
    });

  const changeEditor = (add, who) =>
    run(async () => {
      await (add ? addSellerEditor : removeSellerEditor)(open, who);
      setEditors(await sellerEditors(open));
      setEmail("");
    });

  const importOld = () =>
    run(async () => {
      const r = await importDeviceCatalogue();
      setMsg(
        t("market.imported", {
          added: r.added ?? 0,
          files: r.files ?? 0,
          defaultValue: `Old catalogue imported: ${r.added ?? 0} articles, ${r.files ?? 0} files.`,
        }) + (r.notes?.length ? ` ${r.notes.join("; ")}` : "")
      );
      await onChanged();
    });

  const idOk = ID_RE.test(id.trim());

  return (
    <div className="ov-form">
      <div className="ov-form-head">
        <h3 className="ov-form-title">
          {t("market.sellersTitle", { defaultValue: "Marketplace sellers" })}
        </h3>
        <button
          type="button"
          className="ov-btn ov-btn--ghost"
          disabled={busy}
          onClick={importOld}
          title={t("market.importHint", {
            defaultValue: `The old Catalog becomes seller ${PLATFORM_SELLER}; articles already there are kept.`,
          })}
        >
          {t("market.import", { defaultValue: "Import the old catalogue" })}
        </button>
      </div>

      <div className="ov-tablewrap">
        <table className="ov-table">
          <thead>
            <tr>
              <th>{t("market.sellerId", { defaultValue: "Id" })}</th>
              <th>{t("market.sellerName", { defaultValue: "Name" })}</th>
              <th>{t("market.kind", { defaultValue: "Kind" })}</th>
              <th className="ov-th-right">
                {t("market.articles", { defaultValue: "Articles" })}
              </th>
              <th className="ov-th-right">
                {t("market.version", { defaultValue: "Version" })}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sellers.map((s) => (
              <tr key={s.id}>
                <td className="ov-mono">{s.id}</td>
                <td>{s.name}</td>
                <td>{t(`market.kinds.${s.kind}`, { defaultValue: s.kind })}</td>
                <td className="ov-th-right">{s.articles ?? 0}</td>
                <td className="ov-th-right">{s.version}</td>
                <td className="ov-cell-actions">
                  <button
                    type="button"
                    className="ov-btn ov-btn--ghost"
                    disabled={busy}
                    onClick={() => showEditors(s.id)}
                  >
                    {t("market.editors", { defaultValue: "Editors" })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="ov-field">
          <span className="ov-label">
            {t("market.editorsOf", {
              seller: open,
              defaultValue: `Editors of ${open} (they need an authenticator app)`,
            })}
          </span>
          {editors.length === 0 ? (
            <p className="ov-hint">
              {t("market.noEditors", { defaultValue: "No editors yet." })}
            </p>
          ) : (
            <ul>
              {editors.map((who) => (
                <li key={who}>
                  {who}{" "}
                  <button
                    type="button"
                    className="ov-btn ov-btn--danger"
                    disabled={busy}
                    onClick={() => changeEditor(false, who)}
                  >
                    {t("market.removeEditor", { defaultValue: "Remove" })}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="ov-bar">
            <input
              type="email"
              className="ov-input"
              placeholder={t("market.editorEmail", {
                defaultValue: "e-mail of a registered user",
              })}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="button"
              className="ov-btn ov-btn--primary"
              disabled={busy || !email.includes("@")}
              onClick={() => changeEditor(true, email.trim())}
            >
              {t("market.addEditor", { defaultValue: "Add editor" })}
            </button>
          </div>
        </div>
      )}

      <form className="ov-bar" onSubmit={create}>
        <input
          className="ov-input"
          placeholder={t("market.newId", { defaultValue: "id, e.g. maker-a" })}
          value={id}
          onChange={(e) => setId(e.target.value.toLowerCase())}
          aria-label={t("market.sellerId", { defaultValue: "Id" })}
        />
        <input
          className="ov-input"
          placeholder={t("market.sellerName", { defaultValue: "Name" })}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={t("market.sellerName", { defaultValue: "Name" })}
        />
        <select
          className="ov-input"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label={t("market.kind", { defaultValue: "Kind" })}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`market.kinds.${k}`, { defaultValue: k })}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="ov-btn ov-btn--primary"
          disabled={busy || !idOk || !name.trim()}
        >
          {t("market.createSeller", { defaultValue: "Create seller" })}
        </button>
      </form>
      {id && !idOk && (
        <p className="ov-hint">
          {t("market.idRule", {
            defaultValue:
              "2–40 characters: lowercase letters, digits and dashes, starting with a letter.",
          })}
        </p>
      )}
      {msg && <p className="ov-msg">{msg}</p>}
      {err && <p className="ov-err">{err}</p>}
    </div>
  );
};

export default SellersAdmin;
