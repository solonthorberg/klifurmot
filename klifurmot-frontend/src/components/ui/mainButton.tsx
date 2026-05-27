import React, { useState } from 'react';

interface ButtonProps {
    children?: React.ReactNode;
    onClick?: () => Promise<void> | void;
    variant?: 'primary' | 'outline' | 'delete';
    size?: 'small' | 'medium' | 'large';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    animated?: boolean;
    square?: boolean;
    className?: string;
    title?: string;
}

export default function MainButton({
    children,
    onClick,
    variant = 'primary',
    size = 'medium',
    type = 'button',
    disabled,
    animated = false,
    square = false,
    className = '',
    title,
}: ButtonProps) {
    const [pressed, setPressed] = useState(false);

    const handleClick = async () => {
        if (!onClick) return;
        await onClick();
    };

    const basePress = () => {
        setPressed(true);
        setTimeout(() => setPressed(false), 100);
    };

    const baseStyles =
        'rounded-lg font-medium flex items-center justify-center cursor-pointer gap-2 wrap-break-word disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-75';

    const animation = animated
        ? 'transition-all duration-200 ease-in-out hover:scale-105 active:scale-95'
        : '';

    const variants = {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        outline:
            'border-2 border-primary text-primary hover:bg-primary-light transition-colors duration-200',
        delete: 'border-2 border-red-500 text-red-500 hover:bg-red-100 transition-colors duration-200',
    };

    const sizes = {
        small: square ? 'w-9 h-9 text-sm' : 'px-3 py-1.5 text-sm h-9',
        medium: square ? 'w-10 h-10' : 'px-4 py-2 h-10',
        large: square ? 'w-11 h-11 text-lg' : 'px-6 py-3 text-lg h-11',
    };

    return (
        <button
            onClick={handleClick}
            onMouseDown={basePress}
            onTouchStart={basePress}
            disabled={disabled}
            type={type}
            title={title}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${animation} ${pressed ? 'opacity-80' : ''} ${className}`}
        >
            {children}
        </button>
    );
}
