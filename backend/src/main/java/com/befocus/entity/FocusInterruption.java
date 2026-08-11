package com.befocus.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "focus_interruptions")
@Getter
@Setter
@NoArgsConstructor
public class FocusInterruption extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "focus_session_id", nullable = false)
    private FocusSession focusSession;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private InterruptionKind kind;

    @Column(length = 500)
    private String note;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
}
