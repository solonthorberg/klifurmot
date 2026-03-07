import { useNotificationStore } from '@/stores/notificationStore';

export function Notifications() {
    const { notifications, removeNotification } = useNotificationStore();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`min-w-[280px] px-4 py-3 rounded-lg shadow-lg flex justify-between items-center
                        ${notification.type === 'success' ? 'bg-green-600 text-white' : ''}
                        ${notification.type === 'error' ? 'bg-red-600 text-white' : ''}
                        ${notification.type === 'warning' ? 'bg-yellow-500 text-black' : ''}
                        ${notification.type === 'info' ? 'bg-blue-600 text-white' : ''}
                    `}
                >
                    <span>{notification.message}</span>
                    <button
                        onClick={() => removeNotification(notification.id)}
                        className="ml-4 text-lg font-bold opacity-70 hover:opacity-100"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
