"use client";

/**
 * Asks for a layer's credential when its source refused the request. The value is
 * held in memory for the session and never written into the document.
 */
import { useId, useState } from "react";
import { useConfig } from "@/features/config/ConfigProvider";
import styles from "./CredentialPrompt.module.css";

export const CredentialPrompt = ({ slotName }: { slotName: string }) => {
  const { setSecret } = useConfig();
  const [value, setValue] = useState("");
  const fieldId = useId();

  return (
    <form
      className={styles.credential}
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim() !== "") {
          setSecret(slotName, value.trim());
        }
      }}
    >
      <label htmlFor={fieldId}>{slotName}</label>
      <input
        id={fieldId}
        type="password"
        value={value}
        autoComplete="off"
        placeholder="Paste your key"
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit">Use key</button>
      <p className={styles.hint}>Kept in memory for this session only, never saved or sent anywhere else.</p>
    </form>
  );
};
