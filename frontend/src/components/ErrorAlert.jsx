import Icon from "./Icon";
import { useToast } from "../context/ToastContext";
export default function ErrorAlert() {
  const { error, setError } = useToast();
  return (
    error && (
      <div className="alert error" role="alert">
        {error}
        <button
          className="icon-button"
          aria-label="Đóng thông báo"
          onClick={() => setError("")}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    )
  );
}
