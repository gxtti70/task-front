package com.taskmanager.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ProjectMemberRequest {
    @NotNull
    private UUID userId;
}
