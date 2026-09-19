/**
 * components/
 * Chứa các component dùng chung và có thể tái sử dụng.
 */
const Button = ({ children, onClick, type = "button", variant = "primary" }) => {
  return (
    <button type={type} className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
