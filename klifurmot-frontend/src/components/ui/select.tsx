import Icon from "./icons";

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    variant?: "primary" | "input";
    className?: string;
}

export default function Select({
    value,
    onChange,
    options,
    placeholder,
    variant = "primary",
    className = '',
}: SelectProps) {
    const variants = {
        primary: "border-1 border-outline text-gray-500 rounded-lg",
        input: "rounded-md outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary text-gray-400",
    }

    const baseStyles = `appearance-none px-3 py-2 bg-transparent h-10 pr-8 w-full ${variants[variant]}`;

    return (
        <div className={`relative h-10 ${className}`}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`${baseStyles} ${value ? 'text-gray-900' : 'text-gray-500'}`}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <Icon variant="chevronDown" size={16} className="text-gray-400" />
            </div>
        </div>
    );
}
