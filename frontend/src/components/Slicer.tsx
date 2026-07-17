interface Props<T extends string | number> {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T | "") => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function Slicer<T extends string | number>({
  label, value, options, onChange, allowEmpty = true, emptyLabel = "Todos",
}: Props<T>) {
  return (
    <label className="slicer">
      <span className="slicer__label">{label}</span>
      <select
        className="slicer__select"
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange("");
          const opt = options.find((o) => String(o.value) === raw);
          onChange(opt ? opt.value : "");
        }}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
