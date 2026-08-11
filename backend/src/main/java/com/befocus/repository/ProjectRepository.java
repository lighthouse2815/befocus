package com.befocus.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.befocus.entity.Project;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findAllByUserIdAndArchivedAtIsNullOrderByCreatedAtDesc(UUID userId);
    List<Project> findAllByUserIdAndArchivedAtIsNotNullOrderByArchivedAtDesc(UUID userId);
    Optional<Project> findByIdAndUserId(UUID id, UUID userId);
}
