// src/components/ui/FilterChips.tsx
// What: a row of small pill buttons where exactly one is picked - used to
// filter a list (the to-dos, the transactions).
//
// Props:
//   options  - the choices: a value and the text shown for it
//   value    - the value that's currently picked
//   onChange - called with a value when its chip is clicked
//   label    - what this row filters, for screen readers

interface FilterChipsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: FilterChipsProps<T>) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`chip${option.value === value ? " chip--on" : ""}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
