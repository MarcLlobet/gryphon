"use client";

/**
 * Adds a layer of one protocol, with the same effect as declaring it in the document.
 *
 * It opens with that protocol's working example, and validates through the
 * document's own schema, so anything it produces is a layer the renderers already
 * know how to paint. Additions live in the session only.
 */
import { useId, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import type { LayerType } from "@/core/config/schema";
import { useConfig } from "./ConfigProvider";
import { LayerFieldset } from "./LayerFieldset";
import { buildLayer, emptyValues, EXAMPLE_VALUES, fieldForIssue, type FormValues } from "./layerForm";
import styles from "./AddLayerForm.module.css";

const resolverFor =
  (type: LayerType): Resolver<FormValues> =>
  (values) => {
    const built = buildLayer(type, values);

    if (built.ok) {
      return { values: built.value as unknown as FormValues, errors: {} };
    }

    return {
      values: {},
      errors: Object.fromEntries(
        built.error.map((issue) => [fieldForIssue(issue), { type: "schema", message: issue.message }]),
      ),
    };
  };

export const AddLayerForm = ({ type }: { type: LayerType }) => {
  const { addLayer } = useConfig();
  const idPrefix = useId();
  const [added, setAdded] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: resolverFor(type), defaultValues: EXAMPLE_VALUES[type] });

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit((layer) => {
        // The resolver already parsed this through LayerSchema.
        addLayer(layer as never);
        setAdded((layer as { title?: string }).title ?? "Layer");
        reset(EXAMPLE_VALUES[type]);
      })}
    >
      <LayerFieldset type={type} idPrefix={idPrefix} register={register} errors={errors} />

      <div className={styles.actions}>
        <button type="submit">Add layer</button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            reset(emptyValues(type));
            setAdded(null);
          }}
        >
          Clear the form
        </button>
        {added !== null && <span role="status">{`Added ${added}.`}</span>}
      </div>
    </form>
  );
};
