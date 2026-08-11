package com.befocus.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor
public class User extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 64)
    private String timezone = "Asia/Ho_Chi_Minh";

    @Column(name = "default_focus_minutes", nullable = false)
    private int defaultFocusMinutes = 25;

    @Column(name = "default_break_minutes", nullable = false)
    private int defaultBreakMinutes = 5;

    @Column(name = "long_break_minutes", nullable = false)
    private int longBreakMinutes = 15;

    @Column(name = "sessions_before_long_break", nullable = false)
    private int sessionsBeforeLongBreak = 4;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Theme theme = Theme.SYSTEM;
}
