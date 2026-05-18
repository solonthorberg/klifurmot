import { type TextareaHTMLAttributes } from 'react';

interface TextBoxProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export default function TextBox({
    label,
    error,
    className,
    ...props
}: TextBoxProps) {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label className="text-gray-700">{label}</label>}
            <div
                className={`flex rounded-md bg-white pl-2 outline-1 -outline-offset-1 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary ${error ? 'outline-red-500' : 'outline-gray-300'}`}
            >
                <textarea
                    rows={6}
                    className={`block w-full py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none resize-none ${className ?? ''}`}
                    {...props}
                />
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}
