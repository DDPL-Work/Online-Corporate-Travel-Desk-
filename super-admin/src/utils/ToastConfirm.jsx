import { toast } from "sonner";

export const ToastWithTimer = ({ message, type, duration = 4000 }) => {
  toast(message, {
    duration,
    className: `sonner-toast ${type}`,
    description: (
      <div
        className="sonner-progress"
        style={{ animationDuration: `${duration}ms` }}
      />
    ),
  });
};

export const ToastConfirm = ({
  message,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
}) => {
  const id = toast(
    <div className={`sonner-toast ${type}`}>
      <div className="sonner-content space-y-3">
        <p className="font-medium">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => toast.dismiss(id)}
          >
            {cancelText}
          </button>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded"
            onClick={() => {
              toast.dismiss(id);
              onConfirm?.();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    { duration: Infinity }
  );
  return id;
};
