"use client";
import { useState } from "react";
import type { Control, PropValue } from "@/lib/catalog";
import { formatNumbers, humanize, parseNumbers } from "@/lib/props";

interface FieldProps {
  name: string;
  control: Control;
  value: PropValue | undefined;
  /** The prop's JSDoc, from the catalog. */
  hint: string | undefined;
  onChange: (value: PropValue) => void;
}

/** One inspector control, generated from a catalog item's `controls` entry. */
export function ControlField({ name, control, value, hint, onChange }: FieldProps) {
  const id = `control-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const label = control.label ?? humanize(name);

  if (control.type === "boolean") {
    return (
      <div className="control" data-type="boolean">
        <label className="control-check" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            aria-describedby={hintId}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="label">{label}</span>
        </label>
        {hint && (
          <p id={hintId} className="control-hint">
            {hint}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="control" data-type={control.type}>
      <div className="control-head">
        <label className="label" htmlFor={id}>
          {label}
        </label>
        {control.type === "number" && (
          <output className="control-readout" htmlFor={id} aria-live="off">
            {typeof value === "number" ? String(value) : ""}
          </output>
        )}
      </div>
      {control.type === "number" && (
        <NumberField id={id} control={control} label={label} value={value} hintId={hintId} onChange={onChange} />
      )}
      {control.type === "string" && (
        <input
          id={id}
          className="field"
          type="text"
          value={typeof value === "string" ? value : ""}
          aria-describedby={hintId}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {control.type === "select" && (
        <div className="control-select">
          <select id={id} value={typeof value === "string" ? value : ""} aria-describedby={hintId} onChange={(e) => onChange(e.target.value)}>
            {control.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
      {control.type === "color" && <ColorField id={id} label={label} value={value} hintId={hintId} onChange={onChange} />}
      {control.type === "numbers" && <NumbersField id={id} value={value} hintId={hintId} onChange={onChange} />}
      {hint && (
        <p id={hintId} className="control-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Keeps what the user typed until it disagrees with a value that changed underneath it. */
function useDraft(canonical: string): [string, (draft: string, base: string) => void] {
  const [state, setState] = useState({ draft: canonical, base: canonical });
  const draft = state.base === canonical ? state.draft : canonical;
  return [draft, (next, base) => setState({ draft: next, base })];
}

interface NumberFieldProps {
  id: string;
  control: Extract<Control, { type: "number" }>;
  label: string;
  value: PropValue | undefined;
  hintId: string | undefined;
  onChange: (value: PropValue) => void;
}

function NumberField({ id, control, label, value, hintId, onChange }: NumberFieldProps) {
  const current = typeof value === "number" ? value : null;
  const canonical = current === null ? "" : String(current);
  const [draft, setDraft] = useDraft(canonical);
  const onText = (text: string) => {
    const n = Number(text);
    const valid = text.trim() !== "" && Number.isFinite(n);
    setDraft(text, valid ? String(n) : canonical);
    if (valid) onChange(n);
  };
  return (
    <div className="control-number">
      <input
        id={id}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={current ?? control.min}
        aria-describedby={hintId}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        className="field control-num"
        type="number"
        min={control.min}
        max={control.max}
        step={control.step}
        value={draft}
        aria-label={`${label} value`}
        onChange={(e) => onText(e.target.value)}
        onBlur={() => setDraft(canonical, canonical)}
      />
    </div>
  );
}

interface ColorFieldProps {
  id: string;
  label: string;
  value: PropValue | undefined;
  hintId: string | undefined;
  onChange: (value: PropValue) => void;
}

function ColorField({ id, label, value, hintId, onChange }: ColorFieldProps) {
  const text = typeof value === "string" ? value : "";
  const hex = /^#[0-9a-f]{6}$/i.test(text) ? text : "#000000";
  return (
    <div className="control-color">
      <input id={id} type="color" value={hex} aria-describedby={hintId} onChange={(e) => onChange(e.target.value)} />
      <input
        className="field"
        type="text"
        value={text}
        aria-label={`${label} as CSS`}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface NumbersFieldProps {
  id: string;
  value: PropValue | undefined;
  hintId: string | undefined;
  onChange: (value: PropValue) => void;
}

function NumbersField({ id, value, hintId, onChange }: NumbersFieldProps) {
  const canonical = Array.isArray(value) ? formatNumbers(value) : "";
  const [draft, setDraft] = useDraft(canonical);
  return (
    <input
      id={id}
      className="field"
      type="text"
      inputMode="decimal"
      placeholder="1, 2, 3"
      value={draft}
      aria-describedby={hintId}
      onChange={(e) => {
        const list = parseNumbers(e.target.value);
        setDraft(e.target.value, formatNumbers(list));
        onChange(list);
      }}
      onBlur={() => setDraft(canonical, canonical)}
    />
  );
}
