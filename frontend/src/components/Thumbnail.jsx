import { useState } from "react";
export default function Thumbnail({ item }) {
  const [failed, setFailed] = useState(false);
  const safe =
    item.imageUrl &&
    (/^https?:\/\//i.test(item.imageUrl) || item.imageUrl.startsWith("/"));
  return (
    <span className="thumbnail">
      {safe && !failed ? (
        <img src={item.imageUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        item.name?.charAt(0).toUpperCase()
      )}
    </span>
  );
}
