import { useEffect, useState } from "react";

interface Props {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}

export function NumberField({ label, value, step = 0.01, min, max, decimals = 3, disabled, onCommit }: Props) {
  const format = (input: number) => String(Number(input.toFixed(decimals)));
  const [text, setText] = useState(format(value));

  useEffect(() => {
    setText(format(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setText(format(value));
      return;
    }
    let next = parsed;
    if (min !== undefined) {
      next = Math.max(min, next);
    }
    if (max !== undefined) {
      next = Math.min(max, next);
    }
    setText(format(next));
    if (next !== value) {
      onCommit(next);
    }
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={text}
        step={step}
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }
        }}
      />
    </label>
  );
}

