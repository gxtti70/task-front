package com.taskmanager.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(UUID id, String title, String description, String targetUrl,
                                   boolean read, LocalDateTime createdAt) { }
