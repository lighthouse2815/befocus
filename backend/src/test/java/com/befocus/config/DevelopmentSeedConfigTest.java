package com.befocus.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.befocus.entity.Project;
import com.befocus.entity.User;
import com.befocus.repository.FocusInterruptionRepository;
import com.befocus.repository.FocusSessionRepository;
import com.befocus.repository.HabitEntryRepository;
import com.befocus.repository.HabitRepository;
import com.befocus.repository.NotificationPreferenceRepository;
import com.befocus.repository.ProjectRepository;
import com.befocus.repository.TaskRepository;
import com.befocus.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class DevelopmentSeedConfigTest {
    @Mock private UserRepository userRepository;
    @Mock private NotificationPreferenceRepository preferenceRepository;
    @Mock private HabitRepository habitRepository;
    @Mock private HabitEntryRepository entryRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private FocusSessionRepository sessionRepository;
    @Mock private FocusInterruptionRepository interruptionRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private Clock clock;

    private DevelopmentSeedConfig seed;

    @BeforeEach
    void setUp() {
        seed = new DevelopmentSeedConfig(userRepository, preferenceRepository, habitRepository, entryRepository,
                projectRepository, taskRepository, sessionRepository, interruptionRepository, passwordEncoder, clock);
    }

    @Test
    void createsAUsefulDevelopmentDatasetWhenTheStableAccountIsMissing() {
        when(userRepository.existsByEmailIgnoreCase(DevelopmentSeedConfig.DEMO_EMAIL)).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-password");
        when(clock.instant()).thenReturn(Instant.parse("2026-08-12T02:00:00Z"));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        seed.run(new DefaultApplicationArguments(new String[0]));

        verify(userRepository).save(argThat(user -> user.getEmail().equals(DevelopmentSeedConfig.DEMO_EMAIL)
                && user.getPasswordHash().equals("encoded-password")));
        verify(habitRepository).saveAll(argThat(habits -> habits.spliterator().getExactSizeIfKnown() == 3));
        verify(taskRepository).saveAll(argThat(tasks -> tasks.spliterator().getExactSizeIfKnown() == 2));
        verify(sessionRepository).saveAll(argThat(sessions -> sessions.spliterator().getExactSizeIfKnown() == 3));
        verify(interruptionRepository).save(any());
    }

    @Test
    void skipsEveryWriteWhenTheSeedAccountAlreadyExists() {
        when(userRepository.existsByEmailIgnoreCase(DevelopmentSeedConfig.DEMO_EMAIL)).thenReturn(true);

        seed.run(new DefaultApplicationArguments(new String[0]));

        verify(userRepository, never()).save(any());
        verify(habitRepository, never()).saveAll(any());
        verify(projectRepository, never()).save(any());
        verify(sessionRepository, never()).saveAll(any());
    }
}
