package com.taskmanager.dto.request;

import com.taskmanager.entity.TaskPriority;
import com.taskmanager.entity.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class TaskRequest {
    @NotBlank private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    @PositiveOrZero private Integer storyPoints;
    private List<String> tags;
    private UUID projectId;
    private UUID assigneeId;
}
