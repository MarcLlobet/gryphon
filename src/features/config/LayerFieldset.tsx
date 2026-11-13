/**
 * The fields of one protocol's form, described by `fieldsFor`. Shared by the editable
 * "add a layer" form and the read-only view of an existing layer, so both look the
 * same and show the same options.
 */
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { LayerType } from "@/core/config/schema";
import { fieldsFor, type FormValues } from "./layerForm";
import styles from "./AddLayerForm.module.css";

interface LayerFieldsetProps {
  type: LayerType;
  /** Makes field ids unique when several forms share a page. */
  idPrefix: string;
  /** Editable: wired to react-hook-form. */
  register?: UseFormRegister<FormValues>;
  errors?: FieldErrors<FormValues>;
  /** Read-only: the values to show. */
  values?: FormValues;
}

export const LayerFieldset = ({ type, idPrefix, register, errors, values }: LayerFieldsetProps) => (
  <>
    {fieldsFor[type].map((field) => {
      const message = errors?.[field.name]?.message;
      const fieldId = `${idPrefix}-${field.name}`;
      const value = values?.[field.name];
      // Read-only fields show their stored value; editable ones are controlled by the form.
      const bind = register
        ? register(field.name)
        : field.kind === "checkbox"
          ? { defaultChecked: value === true, readOnly: true }
          : field.kind === "select"
            ? { defaultValue: typeof value === "string" ? value : "" }
            : { defaultValue: typeof value === "string" ? value : "", readOnly: true };

      return (
        <div key={field.name} className={styles.field}>
          <label htmlFor={fieldId}>
            {field.label}
            {field.required && <span aria-hidden="true"> *</span>}
          </label>

          {field.kind === "select" ? (
            <select id={fieldId} {...bind}>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={fieldId}
              type={field.kind === "checkbox" ? "checkbox" : field.kind === "number" ? "number" : "text"}
              placeholder={field.placeholder}
              step={field.kind === "number" ? "any" : undefined}
              aria-invalid={message === undefined ? undefined : true}
              aria-describedby={message === undefined ? undefined : `${fieldId}-error`}
              {...bind}
            />
          )}

          {field.help && <p className={styles.help}>{field.help}</p>}
          {message !== undefined && (
            <p id={`${fieldId}-error`} className={styles.error} role="alert">
              {String(message)}
            </p>
          )}
        </div>
      );
    })}
  </>
);
