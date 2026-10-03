package com.example.project.entity;

import jakarta.persistence.*;

/** ENTITY = 1 dòng trong bảng "roles" (ADMIN, MANAGER, CASHIER, WAITER, BARISTA). */
@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Long id;

    @Column(name = "role_name", nullable = false, length = 30, unique = true)
    private String name;

    @Column(length = 255)
    private String description;

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
