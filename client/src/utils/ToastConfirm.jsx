import { toast } from "react-toastify";

export const ToastConfirm = ({
  message,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
}) => {
  const id = toast(
    ({ closeToast }) => (
      <div className="space-y-3">
        <p className="font-medium">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            className="px-3 py-1 border rounded"
            onClick={closeToast}
          >
            {cancelText}
          </button>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded"
            onClick={() => {
              closeToast();
              onConfirm();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    ),
    {
      type,
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
    }
  );

  return id;
};
