interface ImageProps {
    image: string | null | undefined;
    alt: string | null | undefined;
    variant?: 'card' | 'thumbnail';
    className?: string;
    onClick?: () => Promise<void> | void;
}

export default function Image({
    image,
    alt,
    variant = 'card',
    className = '',
    onClick,
}: ImageProps) {
    const baseStyles = 'object-cover shrink-0';

    const variants = {
        card: 'aspect-square',
        thumbnail: 'w-40 h-40 rounded-full',
    };

    return image ? (
        <img
            src={image}
            alt={alt ?? undefined}
            loading="lazy"
            className={`${baseStyles} ${variants[variant]} ${className}`}
            onClick={onClick}
        />
    ) : (
        <div
            className={`${baseStyles} ${variants[variant]} bg-gray-200 flex items-center justify-center ${className}`}
        >
            <span className="text-gray-400 text-sm">Engin mynd</span>
        </div>
    );
}
