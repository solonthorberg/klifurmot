interface TabButtonProps {
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => Promise<void> | void;
    className?: string;
}

export default function TabButton({
    children,
    active = false,
    onClick,
    className = '',
}: TabButtonProps) {
    const baseStyle = 'relative px-4 py-2 transition-colors duration-200';
    const activeStyle = 'text-primary';
    const inactiveStyle = 'text-gray-500 hover:text-gray-700';

    return (
        <button
            onClick={onClick}
            className={`${baseStyle} ${active ? activeStyle : inactiveStyle} ${className}`}
        >
            {children}
            <span
                className={`absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 ${active ? 'w-full' : 'w-0'}`}
            />
        </button>
    );
}
