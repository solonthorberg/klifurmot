interface ButtonProps {
    children?: React.ReactNode;
    onClick?: () => Promise<void> | void;
    variant?: 'primary' | 'outline' | 'delete';
    size?: 'small' | 'medium' | 'large';
    type?: string;
    disabled?: boolean;
    animated?: boolean;
    className?: string;
}

export default function MainButton({
    children,
    onClick,
    variant = 'primary',
    size = 'medium',
    type = 'button',
    disabled,
    animated = false,
    className = '',
}: ButtonProps) {
    const baseStyles =
        'rounded-lg font-medium flex items-center justify-center gap-2 truncate disabled:opacity-50 disabled:cursor-not-allowed';
    const animation = animated
        ? 'transition-all duration-200 ease-in-out hover:scale-105 active:scale-95'
        : '';
    const variants = {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        outline:
            'border-2 border-primary text-primary hover:bg-primary-light transition-colors duration-200',
        delete: 'border-2 border-red-500 text-red-500 hover:bg-red-50 transition-colors duration-200',
    };
    const sizes = {
        small: 'px-3 py-1.5 text-sm h-9',
        medium: 'px-4 py-2 h-10',
        large: 'px-6 py-3 text-lg h-11',
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            type={type as 'submit' | 'button' | 'reset'}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${animation} ${className}`}
        >
            {children}
        </button>
    );
}
