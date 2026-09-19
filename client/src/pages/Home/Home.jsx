import { useEffect, useState } from "react";
import userService from "../../services/user.service";

/**
 * pages/
 * Chứa các trang (màn hình) của dự án.
 *
 * Luồng: Home.jsx gọi userService --Request(1)--> Server
 * Server xử lý xong trả Response(8) về, setState hiển thị lên UI.
 */
const Home = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await userService.getAll();
        setUsers(res.data || []);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách người dùng:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <p>Đang tải...</p>;

  return (
    <div>
      <h1>Danh sách người dùng</h1>
      <ul>
        {users.map((u) => (
          <li key={u._id}>{u.fullName}</li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
