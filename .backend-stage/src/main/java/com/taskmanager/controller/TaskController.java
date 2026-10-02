package com.taskmanager.controller;

import com.taskmanager.dto.request.TaskRequest;
import com.taskmanager.dto.request.TaskStatusRequest;
import com.taskmanager.dto.response.TaskResponse;
import com.taskmanager.dto.response.UserSummaryResponse;
import com.taskmanager.entity.*;
import com.taskmanager.repository.*;
import com.taskmanager.service.NotificationEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final NotificationEventService notifications;

    @GetMapping
    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks() {
        return taskRepository.findAllWithAssigneeAndProject().stream().map(this::toResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SCRUM', 'MANAGER')")
    @Transactional
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request, Authentication authentication) {
        User actor = currentUser(authentication);
        User assignee = request.getAssigneeId() == null ? actor : findActiveUser(request.getAssigneeId());
        Project project = findProject(request.getProjectId());
        Task task = Task.builder().title(request.getTitle().trim()).description(request.getDescription())
                .status(request.getStatus() == null ? TaskStatus.TODO : request.getStatus())
                .priority(request.getPriority() == null ? TaskPriority.MEDIUM : request.getPriority())
                .storyPoints(request.getStoryPoints() == null ? 1 : request.getStoryPoints())
                .tags(cleanTags(request.getTags())).assignee(assignee).project(project).build();
        Task saved = taskRepository.save(task);
        addMember(project, assignee);

        if (!actor.getId().equals(assignee.getId())) {
            notifications.notifyUser(assignee, "Tarea asignada", "Te asignaron: " + saved.getTitle(), "/dashboard/kanban");
        }
        Set<UUID> excluded = new HashSet<>(List.of(actor.getId(), assignee.getId()));
        notifications.broadcastExcept(excluded, "Nueva tarea", actor.getFullName() + " creó " + saved.getTitle(), "/dashboard/kanban");
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SCRUM', 'MANAGER')")
    @Transactional
    public TaskResponse updateTask(@PathVariable UUID id, @Valid @RequestBody TaskRequest request,
                                   Authentication authentication) {
        User actor = currentUser(authentication);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
        User previousAssignee = task.getAssignee();
        User assignee = request.getAssigneeId() == null ? previousAssignee : findActiveUser(request.getAssigneeId());
        boolean assignmentChanged = !assignee.getId().equals(previousAssignee.getId());
        Project project = findProject(request.getProjectId());
        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription());
        if (request.getStatus() != null) task.setStatus(request.getStatus());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getStoryPoints() != null) task.setStoryPoints(request.getStoryPoints());
        if (request.getTags() != null) task.setTags(cleanTags(request.getTags()));
        task.setAssignee(assignee);
        task.setProject(project);
        Task saved = taskRepository.save(task);
        addMember(project, assignee);
        if (assignmentChanged && !actor.getId().equals(assignee.getId())) {
            notifications.notifyUser(assignee, "Tarea asignada", "Te asignaron: " + saved.getTitle(), "/dashboard/kanban");
        }
        Set<UUID> excluded = new HashSet<>(Set.of(actor.getId()));
        if (assignmentChanged) excluded.add(assignee.getId());
        notifications.broadcastExcept(excluded, "Tarea actualizada",
                "Se actualizaron los datos de " + saved.getTitle(), "/dashboard/kanban");
        return toResponse(saved);
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public TaskResponse updateTaskStatus(@PathVariable UUID id, @Valid @RequestBody TaskStatusRequest request,
                                         Authentication authentication) {
        User actor = currentUser(authentication);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
        task.setStatus(request.getStatus());
        notifications.broadcastExcept(Set.of(actor.getId()), "Estado de tarea actualizado",
                task.getTitle() + " ahora está en " + request.getStatus(), "/dashboard/kanban");
        return toResponse(task);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SCRUM', 'MANAGER')")
    @Transactional
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id, Authentication authentication) {
        User actor = currentUser(authentication);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
        notifications.broadcastExcept(Set.of(actor.getId()), "Tarea eliminada",
                actor.getFullName() + " eliminó " + task.getTitle(), "/dashboard/kanban");
        taskRepository.delete(task);
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private User findActiveUser(UUID id) {
        return userRepository.findById(id).filter(User::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no disponible"));
    }

    private Project findProject(UUID id) {
        if (id == null) return null;
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));
        if (project.getStatus().equals("ARCHIVED")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se pueden asignar tareas a un proyecto archivado");
        }
        return project;
    }

    private List<String> cleanTags(List<String> tags) {
        return tags == null ? new ArrayList<>() : new ArrayList<>(tags.stream().map(String::trim)
                .filter(tag -> !tag.isBlank()).distinct().toList());
    }

    private void addMember(Project project, User user) {
        if (project != null && !memberRepository.existsByProject_IdAndUser_Id(project.getId(), user.getId())) {
            memberRepository.save(ProjectMember.builder().project(project).user(user).build());
        }
    }

    private TaskResponse toResponse(Task task) {
        User user = task.getAssignee();
        String displayName = user.getFullName() == null ? user.getEmail() : user.getFullName();
        String avatar = "https://ui-avatars.com/api/?name=" + URLEncoder.encode(displayName, StandardCharsets.UTF_8)
                + "&background=27272a&color=a1a1aa&bold=true";
        return new TaskResponse(task.getId(), task.getTitle(), task.getDescription(), task.getStatus(),
                task.getPriority(), task.getStoryPoints(),
                new UserSummaryResponse(user.getId(), user.getEmail(), displayName, user.getRole(), avatar),
                task.getTags(), task.getProject() == null ? null : task.getProject().getId(), task.getCreatedAt());
    }
}
