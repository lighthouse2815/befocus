package com.befocus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;

import com.befocus.BeFocusApplication;
import com.befocus.dto.request.ProjectRequest;
import com.befocus.dto.request.TaskRequest;
import com.befocus.dto.response.ProjectResponse;
import com.befocus.dto.response.TaskResponse;
import com.befocus.entity.User;
import com.befocus.exception.ApiException;
import com.befocus.exception.ErrorCode;
import com.befocus.repository.UserRepository;

@SpringBootTest(classes = { BeFocusApplication.class, ProjectTaskServiceIntegrationTest.ClockConfiguration.class })
@Transactional
class ProjectTaskServiceIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-08-12T02:00:00Z");

    @Autowired
    private ProjectService projectService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void createsProjectsTasksAndReturnsUsefulProjectStats() {
        User user = user("projects-flow@example.com");
        ProjectResponse project = projectService.create(user.getId(), new ProjectRequest(
                "  Luận văn  ", "  Chương một  ", "ocean", "✦"));
        TaskResponse task = taskService.create(user.getId(), new TaskRequest(project.id(), "Viết đề cương", null, null));

        assertThat(project.name()).isEqualTo("Luận văn");
        assertThat(project.color()).isEqualTo("ocean");
        assertThat(task.projectId()).isEqualTo(project.id());
        assertThat(task.completed()).isFalse();

        TaskResponse completed = taskService.complete(user.getId(), task.id());
        assertThat(completed.completed()).isTrue();
        assertThat(taskService.complete(user.getId(), task.id()).completedAt()).isEqualTo(completed.completedAt());
        ProjectResponse detail = projectService.get(user.getId(), project.id());
        assertThat(detail.completedTasks()).isEqualTo(1);
        assertThat(detail.pendingTasks()).isZero();
        assertThat(detail.tasks()).singleElement().extracting(TaskResponse::title).isEqualTo("Viết đề cương");
    }

    @Test
    void scopesProjectsAndRejectsTasksInArchivedProjects() {
        User owner = user("project-owner@example.com");
        User other = user("project-other@example.com");
        ProjectResponse project = projectService.create(owner.getId(), new ProjectRequest("Private", null, "ink", null));

        assertThatThrownBy(() -> projectService.get(other.getId(), project.id()))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.getCode()).isEqualTo(ErrorCode.NOT_FOUND));
        projectService.archive(owner.getId(), project.id());
        assertThatThrownBy(() -> taskService.create(owner.getId(), new TaskRequest(project.id(), "Blocked", null, null)))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void validatesProjectColor() {
        User user = user("project-color@example.com");
        assertThatThrownBy(() -> projectService.create(user.getId(), new ProjectRequest("Bad", null, "neon", null)))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.getCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    private User user(String email) {
        User user = new User();
        user.setName("Test User");
        user.setEmail(email);
        user.setPasswordHash("not-used-in-service-tests");
        user.setTimezone("Asia/Ho_Chi_Minh");
        return userRepository.saveAndFlush(user);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ClockConfiguration {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }
}
