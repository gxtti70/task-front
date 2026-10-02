package com.taskmanager.service;

import com.taskmanager.entity.Notification;
import com.taskmanager.entity.User;
import com.taskmanager.repository.NotificationRepository;
import com.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class NotificationEventServiceTest {
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final NotificationEventService service = new NotificationEventService(notificationRepository, userRepository);

    @Test
    void broadcastsOnlyToActiveUsersNotInExclusionList() {
        User first = User.builder().id(UUID.randomUUID()).fullName("Ana").build();
        User excluded = User.builder().id(UUID.randomUUID()).fullName("Luis").build();
        when(userRepository.findAllByActiveTrueOrderByFullNameAsc()).thenReturn(List.of(first, excluded));

        service.broadcastExcept(List.of(excluded.getId()), "Cambio", "Descripción", "/dashboard/projects");

        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size());
        assertEquals(first.getId(), captor.getValue().get(0).getUser().getId());
        assertEquals("Cambio", captor.getValue().get(0).getTitle());
    }

    @Test
    void doesNotSaveWhenThereAreNoRecipients() {
        when(userRepository.findAllByActiveTrueOrderByFullNameAsc()).thenReturn(List.of());

        service.broadcastExcept(List.of(), "Cambio", "Descripción", "/dashboard/projects");

        verify(notificationRepository, never()).saveAll(anyList());
    }
}
