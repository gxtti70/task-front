package com.taskmanager.controller;

import com.taskmanager.dto.request.ProjectMemberRequest;
import com.taskmanager.dto.request.ProjectRequest;
import com.taskmanager.dto.response.ProjectMemberResponse;
import com.taskmanager.dto.response.ProjectResponse;
import com.taskmanager.entity.Project;
import com.taskmanager.entity.ProjectMember;
import com.taskmanager.entity.User;
import com.taskmanager.repository.ProjectMemberRepository;
import com.taskmanager.repository.ProjectRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.service.NotificationEventService;
import com.taskmanager.security.RoleNames;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {
    private static final Set<String> STATUSES = Set.of("ACTIVE", "COMPLETED", "ON_HOLD", "ARCHIVED");
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final NotificationEventService notifications;

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjects() {
        return projectRepository.findAllWithOwner().stream().map(this::toResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SCRUM', 'MANAGER')")
    @Transactional
    public ProjectResponse createProject(@Valid @RequestBody ProjectRequest request, Authentication authentication) {
        User owner = currentUser(authentication);
        Project project = Project.builder().name(request.getName().trim()).description(request.getDescription())
                .status(validateStatus(request.getStatus())).owner(owner).build();
        Project saved = projectRepository.save(project);
        memberRepository.save(ProjectMember.builder().project(saved).user(owner).build());
        notifications.broadcastExcept(Set.of(owner.getId()), "Nuevo proyecto",
                owner.getFullName() + " creó el proyecto " + saved.getName(), "/dashboard/projects");
        return toResponse(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public ProjectResponse updateProject(@PathVariable UUID id, @Valid @RequestBody ProjectRequest request,
                                         Authentication authentication) {
        User actor = currentUser(authentication);
        Project project = findProject(id);
        requireProjectManager(project, actor);
        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());
        project.setStatus(validateStatus(request.getStatus()));
        Project saved = projectRepository.save(project);
        notifications.broadcastExcept(Set.of(actor.getId()), "Proyecto actualizado",
                saved.getName() + " fue actualizado.", "/dashboard/projects");
        return toResponse(saved);
    }

    @GetMapping("/{id}/members")
    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getMembers(@PathVariable UUID id) {
        findProject(id);
        return memberRepository.findByProject_IdOrderByJoinedAtAsc(id).stream().map(member ->
                new ProjectMemberResponse(member.getUser().getId(), member.getUser().getFullName(),
                        member.getUser().getEmail(), member.getUser().getRole(), member.getJoinedAt())).toList();
    }

    @PostMapping("/{id}/members")
    @Transactional
    public ProjectMemberResponse addMember(@PathVariable UUID id, @Valid @RequestBody ProjectMemberRequest request,
                                           Authentication authentication) {
        User actor = currentUser(authentication);
        Project project = findProject(id);
        requireProjectManager(project, actor);
        User user = userRepository.findById(request.getUserId()).filter(User::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no disponible"));
        if (memberRepository.existsByProject_IdAndUser_Id(id, user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El usuario ya pertenece al proyecto");
        }
        ProjectMember member = memberRepository.save(ProjectMember.builder().project(project).user(user).build());
        notifications.notifyUser(user, "Te añadieron a un proyecto", "Ahora participas en " + project.getName(), "/dashboard/projects");
        return new ProjectMemberResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole(), member.getJoinedAt());
    }

    @DeleteMapping("/{id}/members/{userId}")
    @Transactional
    public void removeMember(@PathVariable UUID id, @PathVariable UUID userId, Authentication authentication) {
        User actor = currentUser(authentication);
        Project project = findProject(id);
        requireProjectManager(project, actor);
        if (project.getOwner().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes quitar al propietario del proyecto");
        }
        if (!memberRepository.existsByProject_IdAndUser_Id(id, userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Miembro no encontrado");
        }
        User removed = userRepository.findById(userId).orElseThrow();
        memberRepository.deleteByProject_IdAndUser_Id(id, userId);
        notifications.notifyUser(removed, "Te quitaron de un proyecto", "Ya no formas parte de " + project.getName(), "/dashboard/projects");
    }

    private Project findProject(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private String validateStatus(String status) {
        String normalized = status == null ? "ACTIVE" : status.toUpperCase();
        if (!STATUSES.contains(normalized)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado no válido");
        return normalized;
    }

    private void requireProjectManager(Project project, User actor) {
        if (!project.getOwner().getId().equals(actor.getId()) && !RoleNames.normalize(actor.getRole()).equals("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el propietario o un administrador puede modificar el proyecto");
        }
    }

    private ProjectResponse toResponse(Project project) {
        return new ProjectResponse(project.getId(), project.getName(), project.getDescription(), project.getStatus(),
                taskRepository.countByProject_Id(project.getId()), memberRepository.countByProject_Id(project.getId()),
                project.getOwner().getId(), project.getCreatedAt());
    }
}
