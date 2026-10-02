package com.taskmanager.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminUserResponse(UUID id, String email, String fullName, String role,
                                boolean active, LocalDateTime createdAt) { }
