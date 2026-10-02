package com.taskmanager.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectMemberResponse(UUID id, String fullName, String email, String role,
                                    LocalDateTime joinedAt) { }
