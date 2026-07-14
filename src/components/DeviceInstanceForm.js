import React, { useState, useMemo } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { DEVICE_CATEGORIES } from "../constants/deviceTypes";

// DeviceLifecycle enum (backend) → fallback labels.
const LIFECYCLE = [
  ["NEW", "New"],
  ["ACTIVE", "Active"],
  ["END_OF_LIFE", "End of life"],
  ["DECOMMISSIONED", "Decommissioned"],
];

/**
 * Create / edit a DeviceInstance — **model-first**: pick a Category, then an
 * existing DeviceModel from the catalogue (filtered by category); the chosen
 * model drives `modelNumber` + `deviceType`. You cannot record a device for a
 * model that doesn't exist (add it in Catalogue/Inbox first). Editing a
 * legacy instance whose model is no longer in the catalogue falls back to a
 * read-only modelNumber so the row stays editable.
 *
 * Props: { item, models, onSave, onCancel }. `models` = DeviceModel[] from
 * the catalogue. smartHomeId + owners are injected by the caller.
 */
const DeviceInstanceForm = ({
  item,
  models = [],
  mode = "edit",
  canEdit = true,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEdit = !!item;
  const [editing, setEditing] = useState(mode !== "view" && canEdit);
  const ro = !editing;
  const knownModel = models.find((m) => m.modelNumber === item?.modelNumber);
  const legacy = isEdit && !!item?.modelNumber && !knownModel;

  const initialCat =
    (models.find((m) => m.modelNumber === item?.modelNumber)?.category &&
      DEVICE_CATEGORIES.find(
        (c) =>
          c.id ===
          models.find((m) => m.modelNumber === item?.modelNumber)?.category
      )?.id) ||
    DEVICE_CATEGORIES.find((c) =>
      c.subTypes.some((s) => s.label === item?.deviceType)
    )?.id ||
    DEVICE_CATEGORIES[0].id;

  const [category, setCategory] = useState(initialCat);
  const [modelNumber, setModelNumber] = useState(item?.modelNumber || "");
  const [serialNumber, setSerialNumber] = useState(item?.serialNumber || "");
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate || "");
  const [installationDate, setInstallationDate] = useState(
    item?.installationDate || ""
  );
  const [firmwareVersion, setFirmwareVersion] = useState(
    item?.firmwareVersion || ""
  );
  const [lifecycleState, setLifecycleState] = useState(
    item?.lifecycleState || "NEW"
  );
  const [location, setLocation] = useState(item?.location || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const modelsInCat = useMemo(
    () => models.filter((m) => m.category === category),
    [models, category]
  );

  const selectedModel = models.find((m) => m.modelNumber === modelNumber);
  // deviceType is driven by the chosen model (or kept from a legacy instance).
  const deviceType = legacy ? item.deviceType : selectedModel?.deviceType || "";

  const canSubmit =
    !!modelNumber.trim() &&
    !!serialNumber.trim() &&
    !!deviceType &&
    !saving &&
    (legacy || !!selectedModel);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await onSave({
        ...(isEdit ? { id: item.id } : {}),
        modelNumber: modelNumber.trim(),
        serialNumber: serialNumber.trim(),
        deviceType,
        purchaseDate: purchaseDate || null,
        installationDate: installationDate || null,
        firmwareVersion: firmwareVersion.trim() || null,
        lifecycleState,
        location: location.trim() || null,
      });
    } catch (err) {
      setSubmitError(err?.errors?.[0]?.message || err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const title = !isEdit
    ? t("inventory.devices.addTitle", { defaultValue: "Add device" })
    : ro
      ? t("inventory.devices.viewTitle", {
          serial: item.serialNumber,
          defaultValue: `View device ${item.serialNumber}`,
        })
      : t("inventory.devices.editTitle", {
          serial: item.serialNumber,
          defaultValue: `Modify device ${item.serialNumber}`,
        });

  return (
    <form className="ov-form" onSubmit={handleSubmit}>
      <div className="ov-form-head">
        <h3 className="ov-form-title">{title}</h3>
        {isEdit && canEdit && (
          <button
            type="button"
            className="ov-btn ov-btn--ghost"
            onClick={() => setEditing((v) => !v)}
          >
            {ro
              ? t("inventory.action.modify", { defaultValue: "Modify" })
              : t("inventory.action.view", { defaultValue: "View" })}
          </button>
        )}
      </div>

      {legacy && (
        <p className="ov-warn">
          {t("inventory.devices.legacyModel", {
            model: item.modelNumber,
            defaultValue: `This device references model ${item.modelNumber} which is no longer in the catalogue — model/type are read-only.`,
          })}
        </p>
      )}

      <div className="ov-grid-2">
        {/* ── model-first: Category → Model → derived deviceType ── */}
        <div className="ov-field">
          <label className="ov-label" htmlFor="di-cat">
            {t("inventory.catalogue.category", { defaultValue: "Category" })}
          </label>
          <select
            id="di-cat"
            className="ov-input"
            value={category}
            disabled={legacy || ro}
            onChange={(e) => {
              setCategory(e.target.value);
              setModelNumber("");
            }}
          >
            {DEVICE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {t(`device.category.${c.id}`, { defaultValue: c.label })}
              </option>
            ))}
          </select>
        </div>

        <div className="ov-field">
          <label className="ov-label" htmlFor="di-model">
            {t("inventory.col.model", { defaultValue: "Model" })}
          </label>
          {legacy ? (
            <input
              id="di-model"
              className="ov-input ov-mono"
              value={item.modelNumber}
              readOnly
            />
          ) : (
            <select
              id="di-model"
              className="ov-input"
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
              disabled={ro}
              required
            >
              <option value="">
                {t("inventory.devices.selectModel", {
                  defaultValue: "— select a model —",
                })}
              </option>
              {modelsInCat.map((m) => (
                <option key={m.modelNumber} value={m.modelNumber}>
                  {m.modelNumber} — {m.brand}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!legacy && modelsInCat.length === 0 && (
        <p className="ov-warn">
          {t("inventory.devices.noModelsInCategory", {
            defaultValue:
              "No models in this category yet. Add one in the Catalogue tab (or via Import) before recording a device.",
          })}
        </p>
      )}

      <div className="ov-grid-2">
        <div className="ov-field">
          <label className="ov-label" htmlFor="di-type">
            {t("inventory.devices.typeFromModel", {
              defaultValue: "Device type (from model)",
            })}
          </label>
          <input
            id="di-type"
            className="ov-input"
            value={deviceType || "—"}
            readOnly
          />
        </div>
        <div className="ov-field">
          <label className="ov-label" htmlFor="di-serial">
            {t("inventory.devices.serialNumber", {
              defaultValue: "Serial number",
            })}
          </label>
          <input
            id="di-serial"
            className="ov-input ov-mono"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="SN-000123"
            readOnly={isEdit || ro}
            required
          />
        </div>
        <div className="ov-field">
          <label className="ov-label" htmlFor="di-purchase">
            {t("inventory.devices.purchaseDate", {
              defaultValue: "Purchase date",
            })}
          </label>
          <input
            id="di-purchase"
            className="ov-input"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            readOnly={ro}
          />
        </div>
        <div className="ov-field">
          <label className="ov-label" htmlFor="di-install">
            {t("inventory.devices.installationDate", {
              defaultValue: "Installation date",
            })}
          </label>
          <input
            id="di-install"
            className="ov-input"
            type="date"
            value={installationDate}
            onChange={(e) => setInstallationDate(e.target.value)}
            readOnly={ro}
          />
        </div>
        <div className="ov-field">
          <label className="ov-label" htmlFor="di-fw">
            {t("inventory.devices.firmware", {
              defaultValue: "Firmware version",
            })}
          </label>
          <input
            id="di-fw"
            className="ov-input"
            value={firmwareVersion}
            onChange={(e) => setFirmwareVersion(e.target.value)}
            placeholder="2.4.1"
            readOnly={ro}
          />
        </div>
        <div className="ov-field">
          <label className="ov-label" htmlFor="di-life">
            {t("inventory.col.lifecycle", { defaultValue: "Lifecycle" })}
          </label>
          <select
            id="di-life"
            className="ov-input"
            value={lifecycleState}
            onChange={(e) => setLifecycleState(e.target.value)}
            disabled={ro}
          >
            {LIFECYCLE.map(([value, fallback]) => (
              <option key={value} value={value}>
                {t(`device.lifecycle.${value}`, { defaultValue: fallback })}
              </option>
            ))}
          </select>
        </div>
        <div className="ov-field">
          <label className="ov-label" htmlFor="di-loc">
            {t("inventory.devices.location", { defaultValue: "Location" })}
          </label>
          <input
            id="di-loc"
            className="ov-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("inventory.devices.locationPlaceholder", {
              defaultValue: "Server room / Living room",
            })}
            readOnly={ro}
          />
        </div>
      </div>

      {submitError && <p className="ov-err">{submitError}</p>}

      <div className="ov-form-actions">
        {!ro && (
          <button
            type="submit"
            className="ov-btn ov-btn--primary"
            disabled={!canSubmit}
          >
            {saving
              ? isEdit
                ? t("inventory.action.saving", { defaultValue: "Saving…" })
                : t("inventory.action.adding", { defaultValue: "Adding…" })
              : isEdit
                ? t("inventory.action.save", { defaultValue: "Save" })
                : t("inventory.action.add", { defaultValue: "Add" })}
          </button>
        )}
        <button
          type="button"
          className="ov-btn ov-btn--ghost"
          onClick={onCancel}
        >
          {ro
            ? t("inventory.action.close", { defaultValue: "Close" })
            : t("inventory.action.cancel", { defaultValue: "Cancel" })}
        </button>
      </div>
    </form>
  );
};

export default DeviceInstanceForm;
