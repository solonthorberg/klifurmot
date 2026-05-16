import type { ReactNode } from 'react';
import Icon from './icons';

export default function Modal({
    children,
    onClose,
    className,
}: {
    children: ReactNode;
    onClose?: () => void;
    className?: string;
}) {
    const BaseClass =
        'relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4';

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <div className={`${className} ${BaseClass}`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <Icon variant="exit" />
                </button>
                {children}
            </div>
        </div>
    );
}
