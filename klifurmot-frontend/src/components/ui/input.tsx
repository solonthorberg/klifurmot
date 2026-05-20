import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export default function Input({
    label,
    error,
    className,
    ...props
}: InputProps) {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label className="text-gray-700">{label}</label>}
            <div
                className={`flex items-center rounded-md pl-2 outline-1 -outline-offset-1 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary ${error ? 'outline-red-500' : 'outline-gray-300'} ${className ?? 'bg-white'}`}
            >
                <input
                    className={`block min-w-0 grow py-1.5 pr-3 pl-1 text-base h-10 text-gray-900 placeholder:text-gray-500 focus:outline-none bg-transparent`}
                    {...props}
                />
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}
