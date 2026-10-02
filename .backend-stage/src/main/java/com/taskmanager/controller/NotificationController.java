package com.taskmanager.controller;

import com.taskmanager.dto.response.NotificationResponse;
import com.taskmanager.entity.Notification;
import com.taskmanager.entity.User;
import com.taskmanager.repository.NotificationRepository;
import com.taskmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Authentication authentication) {
        User user = currentUser(authentication);
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse).toList();
    }

    @PatchMapping("/{id}/read")
    @Transactional
    public NotificationResponse markRead(@PathVariable UUID id, Authentication authentication) {
        User user = currentUser(authentication);
        Notification notification = notificationRepository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        notification.setRead(true);
        return toResponse(notification);
    }

    @PatchMapping("/read-all")
    @Transactional
    public int markAllRead(Authentication authentication) {
        return notificationRepository.markAllRead(currentUser(authentication).getId());
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getTitle(),
                notification.getDescription(), notification.getTargetUrl(), notification.isRead(),
                notification.getCreatedAt());
    }
}
