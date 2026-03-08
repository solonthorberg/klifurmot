interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function SearchBar({
    value,
    onChange,
    placeholder = 'Leita...',
    className = '',
}: SearchBarProps) {
    const baseStyles =
        'flex items-center flex-1 border-1 border-outline rounded-lg px-3 py-2 h-10';

    return (
        <div className={`${baseStyles} ${className}`}>
            <svg
                className="w-5 h-5 text-gray-400 mr-2 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full outline-none bg-transparent placeholder:text-gray-500"
            />
        </div>
    );
}
