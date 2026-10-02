package com.taskmanager.service;

import com.taskmanager.entity.Notification;
import com.taskmanager.entity.User;
import com.taskmanager.repository.NotificationRepository;
import com.taskmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationEventService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void notifyUser(User recipient, String title, String description, String targetUrl) {
        notificationRepository.save(build(recipient, title, description, targetUrl));
    }

    @Transactional
    public void broadcastExcept(Collection<UUID> excludedIds, String title, String description, String targetUrl) {
        List<Notification> events = userRepository.findAllByActiveTrueOrderByFullNameAsc().stream()
                .filter(user -> !excludedIds.contains(user.getId()))
                .map(user -> build(user, title, description, targetUrl))
                .toList();
        if (!events.isEmpty()) notificationRepository.saveAll(events);
    }

    private Notification build(User user, String title, String description, String targetUrl) {
        return Notification.builder().user(user).title(title).description(description)
                .targetUrl(targetUrl).build();
    }
}
