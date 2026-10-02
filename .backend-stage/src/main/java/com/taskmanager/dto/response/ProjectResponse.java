package com.taskmanager.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectResponse(UUID id, String name, String description, String status,
                              long tasksCount, long membersCount, UUID ownerId, LocalDateTime createdAt) { }
