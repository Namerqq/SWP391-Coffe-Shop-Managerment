package com.example.project.repository;

import com.example.project.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);

    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByUsernameIgnoreCaseAndIdNot(String username, Long id);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    long countByRole_NameAndStatus(String roleName, String status);

    /** Tìm kiếm danh sách tài khoản: mọi tham số đều có thể null (= bỏ qua điều kiện đó). */
    @Query("""
            SELECT u FROM User u
            WHERE (:keyword IS NULL
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.email)    LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:roleId IS NULL OR u.role.id = :roleId)
              AND (:status IS NULL OR u.status = :status)
            ORDER BY u.id DESC
            """)
    List<User> search(@Param("keyword") String keyword,
                      @Param("roleId") Long roleId,
                      @Param("status") String status);
}
