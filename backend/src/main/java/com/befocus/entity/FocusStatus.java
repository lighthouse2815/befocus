package com.befocus.entity;

public enum FocusStatus {
    READY,
    RUNNING,
    PAUSED,
    COMPLETED,
    CANCELLED;

    public boolean isTerminal() {
        return this == COMPLETED || this == CANCELLED;
    }
}
