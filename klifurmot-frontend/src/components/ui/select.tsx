import Icon from './icons';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    label?: string;
    variant?: 'primary' | 'input';
    className?: string;
    inputClassName?: string;
    error?: string;
    disabled?: boolean;
}

export default function Select({
    value,
    onChange,
    options,
    placeholder,
    label,
    variant = 'primary',
    className = '',
    inputClassName,
    error,
    disabled = false,
}: SelectProps) {
    const variants = {
        primary: 'border-1 border-outline rounded-lg',
        input: 'rounded-md outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary',
    };
    const baseStyles = `appearance-none px-3 py-2 h-10 pr-8 w-full ${variants[variant]}`;

    return (
        <div className={className}>
            {label && <label className="text-gray-700">{label}</label>}
            <div className="relative h-10">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`${baseStyles} ${value ? 'text-gray-900' : 'text-gray-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${inputClassName ?? 'bg-transparent'}`}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <Icon
                        variant="chevronDown"
                        size={16}
                        className="text-gray-400"
                    />
                </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}
