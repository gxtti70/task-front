package com.taskmanager.controller;

import com.taskmanager.dto.request.AdminUserUpdateRequest;
import com.taskmanager.dto.request.LoginRequest;
import com.taskmanager.dto.request.RegisterRequest;
import com.taskmanager.dto.response.AdminUserResponse;
import com.taskmanager.dto.response.JwtResponse;
import com.taskmanager.entity.User;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.JwtTokenProvider;
import com.taskmanager.security.UserDetailsServiceImpl;
import com.taskmanager.security.RoleNames;
import com.taskmanager.service.NotificationEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private static final Set<String> ALLOWED_ROLES = Set.of("ADMIN", "MANAGER", "SCRUM", "DEVELOPER");
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final UserDetailsServiceImpl userDetailsService;
    private final NotificationEventService notifications;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) return ResponseEntity.badRequest().body("Error: El email ya está en uso");
        User user = User.builder().fullName(request.getFullName()).email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword())).role("developer").build();
        userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body("Usuario registrado exitosamente");
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication);
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
        return ResponseEntity.ok(new JwtResponse(accessToken, refreshToken, user.getEmail(), RoleNames.normalize(user.getRole()), user.getId()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null || !tokenProvider.validateToken(refreshToken)
                || !tokenProvider.isRefreshToken(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Refresh token inválido o expirado");
        }
        UserDetails userDetails = userDetailsService.loadUserByUsername(tokenProvider.getUsernameFromToken(refreshToken));
        if (!userDetails.isEnabled()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("La cuenta está desactivada");
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        return ResponseEntity.ok(Map.of("accessToken", tokenProvider.generateAccessToken(authentication)));
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public java.util.List<AdminUserResponse> getUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toAdminResponse).toList();
    }

    @PostMapping("/admin/create-user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUserByAdmin(@Valid @RequestBody RegisterRequest request,
                                               @RequestParam String role) {
        if (userRepository.existsByEmail(request.getEmail())) return ResponseEntity.badRequest().body("Error: El email ya está en uso");
        String normalizedRole = role.toUpperCase();
        if (!ALLOWED_ROLES.contains(normalizedRole)) return ResponseEntity.badRequest().body("Error: El rol no es válido");
        User user = userRepository.save(User.builder().fullName(request.getFullName()).email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword())).role(normalizedRole.toLowerCase()).build());
        notifications.notifyUser(user, "Cuenta creada", "Tu cuenta está lista para usar TaskFront.", "/dashboard/kanban");
        return ResponseEntity.status(HttpStatus.CREATED).body(toAdminResponse(user));
    }

    @PatchMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable UUID id, @Valid @RequestBody AdminUserUpdateRequest request,
                                        Authentication authentication) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        String role = RoleNames.normalize(request.getRole());
        if (!ALLOWED_ROLES.contains(role)) return ResponseEntity.badRequest().body("Rol no válido");
        User actor = userRepository.findByEmail(authentication.getName()).orElseThrow();
        if (actor.getId().equals(user.getId()) && !request.getActive()) {
            return ResponseEntity.badRequest().body("No puedes desactivar tu propia cuenta");
        }
        boolean losingAdmin = RoleNames.normalize(user.getRole()).equals("ADMIN")
                && (!role.equals("ADMIN") || !request.getActive());
        if (losingAdmin && userRepository.countByRoleIgnoreCaseAndActiveTrue("admin") <= 1) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Debe permanecer al menos un administrador activo");
        }
        user.setRole(role.toLowerCase());
        user.setActive(request.getActive());
        User saved = userRepository.save(user);
        if (saved.isActive()) notifications.notifyUser(saved, "Cuenta actualizada",
                "Tu rol o acceso fue actualizado por administración.", "/dashboard/kanban");
        return ResponseEntity.ok(toAdminResponse(saved));
    }

    private AdminUserResponse toAdminResponse(User user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getFullName(),
                RoleNames.normalize(user.getRole()), user.isActive(), user.getCreatedAt());
    }
}
