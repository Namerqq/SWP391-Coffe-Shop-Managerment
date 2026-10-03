import Icon from "./Icon";
export default function EmptyState({ title, description, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name="bag" size={30} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
