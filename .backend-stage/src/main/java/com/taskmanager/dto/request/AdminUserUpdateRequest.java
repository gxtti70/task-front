package com.taskmanager.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminUserUpdateRequest {
    @NotBlank private String role;
    @NotNull private Boolean active;
}
