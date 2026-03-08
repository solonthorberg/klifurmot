interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
}

export default function Select({
    value,
    onChange,
    options,
    placeholder,
    className = '',
}: SelectProps) {
    const baseStyles =
        'border-1 border-outline rounded-lg px-3 py-2 bg-transparent outline-none text-gray-500 h-10';

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseStyles} ${className}`}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}
