package com.taskmanager.dto.response;

import com.taskmanager.entity.TaskPriority;
import com.taskmanager.entity.TaskStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TaskResponse(UUID id, String title, String description, TaskStatus status,
                           TaskPriority priority, Integer storyPoints,
                           UserSummaryResponse assignee, List<String> tags,
                           UUID projectId, LocalDateTime createdAt) { }
