interface Props {
  id: string;
  label: string;
  type: 'text' | 'url' | 'password';
  autoComplete?: string;
  placeholder?: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function FormField({
  id,
  label,
  type,
  autoComplete,
  placeholder,
  value,
  error,
  disabled,
  onChange,
}: Props) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        className="field-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
      />
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
