package com.befocus.mapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.befocus.dto.response.FocusInterruptionResponse;
import com.befocus.dto.response.FocusSessionResponse;
import com.befocus.entity.FocusInterruption;
import com.befocus.entity.FocusSession;
import com.befocus.repository.FocusInterruptionRepository;

@Component
public class FocusMapper {
    private final FocusInterruptionRepository interruptionRepository;

    public FocusMapper(FocusInterruptionRepository interruptionRepository) {
        this.interruptionRepository = interruptionRepository;
    }

    public FocusSessionResponse toResponse(FocusSession session) {
        List<FocusInterruptionResponse> interruptions = interruptionRepository
                .findAllByFocusSessionIdOrderByOccurredAtAsc(session.getId())
                .stream()
                .map(this::toResponse)
                .toList();
        return toResponse(session, interruptions);
    }

    public List<FocusSessionResponse> toResponses(List<FocusSession> sessions) {
        if (sessions.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<FocusInterruptionResponse>> interruptions = interruptionRepository
                .findAllByFocusSessionIdInOrderByOccurredAtAsc(sessions.stream().map(FocusSession::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(item -> item.getFocusSession().getId(),
                        Collectors.mapping(this::toResponse, Collectors.toList())));
        return sessions.stream()
                .map(session -> toResponse(session, interruptions.getOrDefault(session.getId(), List.of())))
                .toList();
    }

    private FocusSessionResponse toResponse(FocusSession session, List<FocusInterruptionResponse> interruptions) {
        return new FocusSessionResponse(
                session.getId(),
                session.getStatus(),
                session.getPlannedDurationMinutes(),
                session.getActualDurationMinutes(),
                session.getStartedAt(),
                session.getExpectedEndAt(),
                session.getPausedAt(),
                session.getTotalPausedSeconds(),
                session.getCompletedAt(),
                session.getCancelledAt(),
                session.getProject() == null ? null : session.getProject().getId(),
                session.getProject() == null ? null : session.getProject().getName(),
                session.getTask() == null ? null : session.getTask().getId(),
                session.getTask() == null ? null : session.getTask().getTitle(),
                session.getHabit() == null ? null : session.getHabit().getId(),
                session.getHabit() == null ? null : session.getHabit().getName(),
                interruptions);
    }

    public FocusInterruptionResponse toResponse(FocusInterruption interruption) {
        return new FocusInterruptionResponse(
                interruption.getId(),
                interruption.getKind(),
                interruption.getNote(),
                interruption.getOccurredAt());
    }
}
