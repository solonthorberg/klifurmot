interface ContainerProps {
    children: React.ReactNode;
    variant?: 'primary' | 'centered';
    className?: string;
}

export default function Container({
    children,
    variant = 'primary',
    className = '',
}: ContainerProps) {
    const baseStyles = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
    const variants = {
        primary: 'flex flex-col items-center justify-center pt-8',
        centered: 'flex flex-col items-center justify-center h-full pb-30',
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
}
