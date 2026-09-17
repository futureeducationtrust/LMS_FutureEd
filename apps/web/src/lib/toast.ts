// Single toast API for the app.
//
// Two systems used to coexist: `react-hot-toast` (imported in 11 files, but
// its <Toaster /> was never mounted, so every toast.success/error there was
// silently dropped) and the zustand store rendered by <ToastContainer />.
// This module keeps the familiar `toast.success("…")` / `toast.error("…")`
// call shape and routes it to the one system that actually renders.
//
// Usage: import toast from "@/lib/toast";
import { useNotifications } from "@/store/notifications";

type Msg = string | { title: string; message?: string };

function split(msg: Msg): { title: string; message?: string } {
  if (typeof msg === "string") return { title: msg };
  return msg;
}

const toast = {
  success(msg: Msg) {
    const { title, message } = split(msg);
    useNotifications.getState().success(title, message);
  },
  error(msg: Msg) {
    const { title, message } = split(msg);
    useNotifications.getState().error(title, message);
  },
  warning(msg: Msg) {
    const { title, message } = split(msg);
    useNotifications.getState().warning(title, message);
  },
  info(msg: Msg) {
    const { title, message } = split(msg);
    useNotifications.getState().info(title, message);
  },
};

export default toast;
