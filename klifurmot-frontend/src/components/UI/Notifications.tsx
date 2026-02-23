import { Alert, Stack } from '@mui/material';

import { useNotificationStore } from '@/stores/notificationStore';

export function Notifications() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          severity={notification.type}
          onClose={() => removeNotification(notification.id)}
          sx={{ minWidth: 280 }}
        >
          {notification.message}
        </Alert>
      ))}
    </Stack>
  );
}
