import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { DEVICE_CATEGORIES } from "../constants/deviceTypes";
import {
  uploadCatalogueAsset,
  catalogueAssetPath,
  fetchCatalogueImageUrl,
} from "../utils/s3";

/**
 * Create / view / edit a DeviceModel (catalogue). Reused by DeviceCatalogue
 * and Inbox Stage-1. `modelNumber` is the identifier → read-only on edit.
 *
 * Capability checkboxes (Actor/Sensor/Controller/IOT) are flat booleans mapped
 * via manifest, NOT T-Box. Multi-doc + single-image upload go to
 * public/catalogue/devices/<deviceType>/<modelNumber>/{docs,img}; a small
 * client-generated data-URL `thumbnail` backs the list views. mode = view|edit
 * with an in-form toggle.
 *
 * Non-rendered schema fields (region, standards, compatibleClasses,
 * s3SpecsPath) are preserved from `item` on save.
 */
const PASSTHROUGH = ["region", "standards", "compatibleClasses", "s3SpecsPath"];
const CAPS = [
  ["hasActorCapability", "actor", "Actor"],
  ["hasSensorCapability", "sensor", "Sensor"],
  ["hasControllerCapability", "controller", "Controller"],
  ["hasIOTCapability", "iot", "IOT (connectable)"],
];
const POWER_SOURCES = [
  ["", "—"],
  ["FIXED", "Fixed (hard-wired)"],
  ["SOCKET", "Socket (plug)"],
  ["BATTERY", "Battery"],
  ["ACCU", "Accu (rechargeable)"],
];
const COMMON_VOLTAGES = ["220", "110", "48", "24", "12", "6", "5", "3.7"];
const THUMB_MAX = 96;

// Session-only remembered category/deviceType: pre-fills the next add-form so
// you don't have to re-pick the same Category every time you enter several
// models in a row. Module-level → persists across mounts but resets on full
// reload (intentional).
let lastUsedCategory = null;
let lastUsedDeviceType = null;

// Downscale an image File → small JPEG data URL (browser-only; called from a
// change handler, never at SSR).
function makeThumbnail(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, THUMB_MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try {
        resolve(c.toDataURL("image/jpeg", 0.6));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

const DeviceModelForm = ({
  item,
  mode = "edit",
  canEdit = true,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEdit = !!item?.modelNumber;
  const [editing, setEditing] = useState(mode !== "view" && canEdit);

  const [modelNumber, setModelNumber] = useState(item?.modelNumber || "");
  // For an existing item, resolve from its own fields. For a new entry, fall
  // back to the last-used pair (session memory) before defaulting to the first
  // category, so consecutive add-flows keep their grouping.
  const fallbackCat =
    lastUsedCategory && DEVICE_CATEGORIES.find((c) => c.id === lastUsedCategory)
      ? lastUsedCategory
      : DEVICE_CATEGORIES[0].id;
  const initialCat = (
    DEVICE_CATEGORIES.find((c) => c.id === item?.category) ||
    DEVICE_CATEGORIES.find((c) =>
      c.subTypes.some((s) => s.label === item?.deviceType)
    ) ||
    DEVICE_CATEGORIES.find((c) => c.id === fallbackCat) ||
    DEVICE_CATEGORIES[0]
  ).id;
  const initialCatSubTypes = DEVICE_CATEGORIES.find(
    (c) => c.id === initialCat
  ).subTypes;
  const fallbackDeviceType =
    !item?.deviceType &&
    lastUsedDeviceType &&
    initialCatSubTypes.some((s) => s.label === lastUsedDeviceType)
      ? lastUsedDeviceType
      : null;
  const [category, setCategory] = useState(initialCat);
  const [deviceType, setDeviceType] = useState(
    item?.deviceType || fallbackDeviceType || initialCatSubTypes[0].label
  );
  const [brand, setBrand] = useState(item?.brand || "");
  const [description, setDescription] = useState(item?.description || "");
  const [caps, setCaps] = useState(() =>
    Object.fromEntries(CAPS.map(([k]) => [k, !!item?.[k]]))
  );
  const [docFiles, setDocFiles] = useState([]); // File[]
  const [imageFile, setImageFile] = useState(null); // File | null
  const [thumb, setThumb] = useState(item?.thumbnail || null);
  // Pre-uploaded image discovered at the canonical catalogue path. Surfaces
  // images pushed via upload_catalogue_images.py before any DeviceModel row
  // exists. The path (when found) is also stamped into s3ImgPath on save so
  // the persisted record reflects the existing object.
  const [remoteImage, setRemoteImage] = useState(null); // {url, path} | null
  const trimmedModelNumber = modelNumber.trim();
  useEffect(() => {
    let cancelled = false;
    if (item?.thumbnail || item?.s3ImgPath || imageFile) return undefined;
    if (!trimmedModelNumber || !deviceType) return undefined;
    fetchCatalogueImageUrl(deviceType, trimmedModelNumber)
      .then((hit) => {
        if (!cancelled) setRemoteImage(hit);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    trimmedModelNumber,
    deviceType,
    item?.thumbnail,
    item?.s3ImgPath,
    imageFile,
  ]);
  const [powerSource, setPowerSource] = useState(item?.powerSource || "");
  const numStr = (v) => (v == null ? "" : String(v));
  const [voltageV, setVoltageV] = useState(numStr(item?.voltageV));
  const [currentA, setCurrentA] = useState(numStr(item?.currentA));
  const [powerW, setPowerW] = useState(numStr(item?.powerW));
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const ro = !editing; // read-only (view mode)
  const subTypes = useMemo(
    () => DEVICE_CATEGORIES.find((c) => c.id === category)?.subTypes || [],
    [category]
  );
  const canSubmit =
    !!modelNumber.trim() && !!brand.trim() && !!deviceType && !saving;

  const onImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    try {
      setThumb(await makeThumbnail(f));
    } catch {
      setSubmitError(
        t("inventory.model.thumbFailed", {
          defaultValue: "Could not generate a preview from that image.",
        })
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const mn = modelNumber.trim();
      let s3DocPath = item?.s3DocPath || null;
      let s3ImgPath = item?.s3ImgPath || null;

      // Uploads go to the world-readable, admin-write public/catalogue prefix.
      for (const df of docFiles) {
        await uploadCatalogueAsset(
          deviceType,
          mn,
          "docs",
          df.name,
          df,
          df.type || "application/octet-stream"
        );
        s3DocPath = catalogueAssetPath(deviceType, mn, "docs", "").replace(
          /\/$/,
          ""
        );
      }
      if (imageFile) {
        const ext = (imageFile.name.split(".").pop() || "img").toLowerCase();
        await uploadCatalogueAsset(
          deviceType,
          mn,
          "img",
          `cover.${ext}`, // single fixed name → one image (re-upload replaces)
          imageFile,
          imageFile.type || "application/octet-stream"
        );
        s3ImgPath = catalogueAssetPath(deviceType, mn, "img", "").replace(
          /\/$/,
          ""
        );
      }

      const passthrough = {};
      for (const k of PASSTHROUGH)
        if (item && item[k] != null) passthrough[k] = item[k];

      // No new file picked, no s3ImgPath on the source row, but we did find
      // a pre-uploaded image at the canonical path → record it on the model.
      if (!imageFile && !s3ImgPath && remoteImage) {
        s3ImgPath = catalogueAssetPath(deviceType, mn, "img", "").replace(
          /\/$/,
          ""
        );
      }

      lastUsedCategory = category;
      lastUsedDeviceType = deviceType;
      await onSave({
        modelNumber: mn,
        brand: brand.trim(),
        category,
        deviceType,
        description: description.trim() || null,
        ...caps,
        powerSource: powerSource || null,
        voltageV: voltageV === "" ? null : Number(voltageV),
        currentA: currentA === "" ? null : Number(currentA),
        powerW: powerW === "" ? null : Number(powerW),
        s3DocPath,
        s3ImgPath,
        thumbnail: thumb || null,
        ...passthrough,
        _isEdit: isEdit,
      });
    } catch (err) {
      setSubmitError(err?.errors?.[0]?.message || err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const title = !isEdit
    ? t("inventory.model.addTitle", { defaultValue: "Add catalogue model" })
    : ro
      ? t("inventory.model.viewTitle", {
          model: item.modelNumber,
          defaultValue: `View model ${item.modelNumber}`,
        })
      : t("inventory.model.editTitle", {
          model: item.modelNumber,
          defaultValue: `Modify model ${item.modelNumber}`,
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

      <div className="ov-grid-2">
        <div className="ov-field">
          <label className="ov-label" htmlFor="dm-model">
            {t("inventory.model.modelNumber", { defaultValue: "Model number" })}
          </label>
          <input
            id="dm-model"
            className="ov-input ov-mono"
            value={modelNumber}
            onChange={(e) => setModelNumber(e.target.value)}
            placeholder="ACME-NVR-8CH"
            readOnly={isEdit || ro}
            required
          />
        </div>
        <div className="ov-field">
          <label className="ov-label" htmlFor="dm-brand">
            {t("inventory.model.brand", { defaultValue: "Brand" })}
          </label>
          <input
            id="dm-brand"
            className="ov-input"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="ACME"
            readOnly={ro}
            required
          />
        </div>
      </div>

      <div className="ov-grid-2">
        <div className="ov-field">
          <label className="ov-label" htmlFor="dm-cat">
            {t("inventory.catalogue.category", { defaultValue: "Category" })}
          </label>
          <select
            id="dm-cat"
            className="ov-input"
            value={category}
            disabled={ro}
            onChange={(e) => {
              setCategory(e.target.value);
              const c = DEVICE_CATEGORIES.find((x) => x.id === e.target.value);
              setDeviceType(c.subTypes[0].label);
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
          <label className="ov-label" htmlFor="dm-type">
            {t("inventory.model.deviceType", { defaultValue: "Device type" })}
          </label>
          {/* deviceType stores the label itself → never translate the option
              text, it would corrupt the persisted value. */}
          <select
            id="dm-type"
            className="ov-input"
            value={deviceType}
            disabled={ro}
            onChange={(e) => setDeviceType(e.target.value)}
          >
            {subTypes.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ov-field">
        <label className="ov-label" htmlFor="dm-desc">
          {t("inventory.model.description", { defaultValue: "Description" })}
        </label>
        <input
          id="dm-desc"
          className="ov-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          readOnly={ro}
        />
      </div>

      <div className="ov-field">
        <span className="ov-label">
          {t("inventory.model.capabilities", { defaultValue: "Capabilities" })}
        </span>
        <div className="ov-checks">
          {CAPS.map(([k, tone, fallback]) => (
            <label key={k} className="ov-check">
              <input
                type="checkbox"
                checked={!!caps[k]}
                disabled={ro}
                onChange={(e) =>
                  setCaps((c) => ({ ...c, [k]: e.target.checked }))
                }
              />
              {t(`device.capability.${tone}`, { defaultValue: fallback })}
            </label>
          ))}
        </div>
      </div>

      <div className="ov-field">
        <span className="ov-label">
          {t("inventory.model.power", { defaultValue: "Power" })}
        </span>
        <div className="ov-grid-4">
          <div className="ov-field">
            <label className="ov-label" htmlFor="dm-src">
              {t("inventory.model.powerSource", { defaultValue: "Source" })}
            </label>
            <select
              id="dm-src"
              className="ov-input"
              value={powerSource}
              disabled={ro}
              onChange={(e) => setPowerSource(e.target.value)}
            >
              {POWER_SOURCES.map(([v, l]) => (
                <option key={v} value={v}>
                  {v
                    ? t(`device.powerSource.${v}`, { defaultValue: l })
                    : l}
                </option>
              ))}
            </select>
          </div>
          <div className="ov-field">
            <label className="ov-label" htmlFor="dm-v">
              {t("inventory.model.voltage", { defaultValue: "Voltage (V)" })}
            </label>
            <input
              id="dm-v"
              className="ov-input"
              type="number"
              step="any"
              list="dhc-volts"
              value={voltageV}
              readOnly={ro}
              onChange={(e) => setVoltageV(e.target.value)}
              placeholder="220"
            />
            <datalist id="dhc-volts">
              {COMMON_VOLTAGES.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>
          <div className="ov-field">
            <label className="ov-label" htmlFor="dm-a">
              {t("inventory.model.current", { defaultValue: "Current (A)" })}
            </label>
            <input
              id="dm-a"
              className="ov-input"
              type="number"
              step="any"
              value={currentA}
              readOnly={ro}
              onChange={(e) => setCurrentA(e.target.value)}
              placeholder="0.5"
            />
          </div>
          <div className="ov-field">
            <label className="ov-label" htmlFor="dm-w">
              {t("inventory.model.powerIn", { defaultValue: "Power in (W)" })}
            </label>
            <input
              id="dm-w"
              className="ov-input"
              type="number"
              step="any"
              value={powerW}
              readOnly={ro}
              onChange={(e) => setPowerW(e.target.value)}
              placeholder="110"
            />
          </div>
        </div>
      </div>

      <div className="ov-grid-2">
        <div className="ov-field">
          <span className="ov-label">
            {t("inventory.model.image", { defaultValue: "Image (one)" })}
          </span>
          {!ro && (
            <input
              className="ov-file"
              type="file"
              accept="image/*"
              onChange={onImage}
            />
          )}
          {thumb ? (
            <img
              className="ov-thumb ov-thumb--lg ov-thumb--preview"
              src={thumb}
              alt=""
            />
          ) : remoteImage ? (
            <>
              <img
                className="ov-thumb ov-thumb--lg ov-thumb--preview"
                src={remoteImage.url}
                alt=""
              />
              <p className="ov-hint">
                {t("inventory.model.preUploaded", {
                  defaultValue: "pre-uploaded — will be linked on save",
                })}
              </p>
            </>
          ) : (
            <p className="ov-hint">
              {item?.s3ImgPath
                ? t("inventory.model.imageUploaded", {
                    defaultValue: "image uploaded",
                  })
                : t("inventory.model.noImage", { defaultValue: "no image" })}
            </p>
          )}
        </div>
        <div className="ov-field">
          <span className="ov-label">
            {t("inventory.model.docs", { defaultValue: "Docs (one or more)" })}
          </span>
          {!ro && (
            <input
              className="ov-file"
              type="file"
              multiple
              onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
            />
          )}
          <p className="ov-hint">
            {docFiles.length
              ? t("inventory.model.docsPending", {
                  count: docFiles.length,
                  defaultValue: `${docFiles.length} file(s) to upload`,
                })
              : item?.s3DocPath
                ? t("inventory.model.docsUploaded", {
                    defaultValue: "docs uploaded",
                  })
                : t("inventory.model.noDocs", { defaultValue: "no docs" })}
          </p>
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

export default DeviceModelForm;
