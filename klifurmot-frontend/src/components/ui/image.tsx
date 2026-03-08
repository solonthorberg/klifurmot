interface ImageProps {
    image: string | null;
    alt: string;
    variant?: 'card' | 'thumbnail';
    className?: string;
}

export default function Image({
    image,
    alt,
    variant = 'card',
    className = '',
}: ImageProps) {
    const baseStyles = 'object-cover shrink-0';

    const variants = {
        card: 'aspect-square',
        thumbnail: 'w-16 h-16 rounded-full',
    };

    return image ? (
        <img
            src={image}
            alt={alt}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        />
    ) : (
        <div
            className={`${baseStyles} ${variants[variant]} bg-gray-200 flex items-center justify-center ${className}`}
        >
            <span className="text-gray-400 text-sm">Engin mynd</span>
        </div>
    );
}
