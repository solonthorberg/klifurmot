interface ButtonProps {
    children?: React.ReactNode;
    onClick?: () => Promise<void> | void;
    variant?: 'primary' | 'secondary';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    className?: string;
}

export default function MainButton({
    children,
    onClick,
    variant = 'primary',
    size = 'medium',
    disabled,
    className = '',
}: ButtonProps) {
    const baseStyles =
        'rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    };

    const sizes = {
        small: 'px-3 py-1.5 text-sm',
        medium: 'px-4 py-2',
        large: 'px-6 py-3 text-lg',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {children}
        </button>
    );
}
