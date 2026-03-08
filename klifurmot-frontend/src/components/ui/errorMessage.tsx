interface ErrorMessageProps {
    message?: string;
    className?: string;
}

export default function ErrorMessage({
    message = 'Eitthvað fór úrskeiðis, endilega hafðu samband.',
    className = '',
}: ErrorMessageProps) {
    return (
        <div
            className={`flex justify-center items-center py-8 text-red-500 ${className}`}
        >
            <p>{message}</p>
        </div>
    );
}
