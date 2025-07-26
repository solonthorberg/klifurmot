import { createContext, useContext, useState } from "react";
import { Snackbar, Alert, Slide } from "@mui/material";

const NotificationContext = createContext();

function SlideTransition(props) {
  return <Slide {...props} direction="down" />;
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = "info", duration = 4000) => {
    const id = Date.now();
    const newNotification = { id, message, type, duration };

    setNotifications((prev) => [...prev, newNotification]);

    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const showSuccess = (message, duration) =>
    showNotification(message, "success", duration);
  const showError = (message, duration) =>
    showNotification(message, "error", duration);
  const showWarning = (message, duration) =>
    showNotification(message, "warning", duration);
  const showInfo = (message, duration) =>
    showNotification(message, "info", duration);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}

      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={null}
          onClose={() => removeNotification(notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          sx={{
            mt: index * 7,
            zIndex: 9999 + index,
          }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{
              minWidth: "300px",
              boxShadow: 3,
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};
