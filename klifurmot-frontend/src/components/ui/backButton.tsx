import Icon from './icons';

interface ButtonProps {
    className?: string;
    onClick?: () => void;
}

export default function BackButton({ className, onClick }: ButtonProps) {
    return (
        <button
            className={`${className} outline-2 outline-primary-light hover:outline-primary-hover rounded-full flex size-9 shrink-0 items-center justify-center`}
            onClick={onClick}
        >
            <Icon
                variant="backButton"
                className="translate-x-[-1.5px] size-1/2"
            />
        </button>
    );
}
