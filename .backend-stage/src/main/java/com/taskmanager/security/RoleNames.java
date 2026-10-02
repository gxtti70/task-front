package com.taskmanager.security;

import java.util.Locale;

public final class RoleNames {
    private RoleNames() { }

    public static String normalize(String role) {
        if (role == null) return "DEVELOPER";
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        while (normalized.startsWith("ROLE_")) normalized = normalized.substring(5);
        return normalized.isBlank() ? "DEVELOPER" : normalized;
    }

    public static String authority(String role) {
        return "ROLE_" + normalize(role);
    }
}
