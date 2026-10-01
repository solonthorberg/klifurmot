import { useId } from 'react';

type ToggleProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    loading?: boolean;
    size?: 'sm' | 'md';
    className?: string;
};

const sizes = {
    sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'translate-x-4' },
    md: { track: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'translate-x-5' },
};

export default function Toggle({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    loading = false,
    size = 'md',
    className = '',
}: ToggleProps) {
    const id = useId();
    const isDisabled = disabled || loading;
    const s = sizes[size];

    return (
        <div className={`flex items-center justify-between gap-3 ${className}`}>
            {(label || description) && (
                <div className="flex flex-col">
                    {label && (
                        <label
                            htmlFor={id}
                            className={`text-sm font-medium ${isDisabled ? 'opacity-50' : 'cursor-pointer'}`}
                        >
                            {label}
                        </label>
                    )}
                    {description && (
                        <span
                            id={`${id}-description`}
                            className="text-xs text-gray-500"
                        >
                            {description}
                        </span>
                    )}
                </div>
            )}

            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-busy={loading}
                aria-describedby={description ? `${id}-description` : undefined}
                disabled={isDisabled}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent p-0 transition-colors duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                    ${s.track}
                    ${checked ? 'bg-blue-600' : 'bg-gray-300'}
                    ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out
                        ${s.thumb}
                        ${checked ? s.translate : 'translate-x-0'}`}
                />
            </button>
        </div>
    );
}
