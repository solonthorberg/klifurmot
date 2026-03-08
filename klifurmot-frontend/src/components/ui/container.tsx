interface ContainerProps {
    children: React.ReactNode;
    variant?: 'primary' | 'primaryCenter' | 'centered' | 'tab';
    className?: string;
}

export default function Container({
    children,
    variant = 'primary',
    className = '',
}: ContainerProps) {
    const baseStyles = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

    const variants = {
        primary: `${baseStyles} flex flex-col pt-8 pb-8`,
        primaryCenter: `${baseStyles} flex flex-col items-center justify-center pt-8`,
        centered: `${baseStyles} flex flex-col items-center justify-center pb-30`,
        tab: 'flex items-start w-full',
    };

    return (
        <div className={`${variants[variant]} ${className}`}>{children}</div>
    );
}
