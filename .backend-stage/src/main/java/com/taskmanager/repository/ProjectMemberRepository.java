package com.taskmanager.repository;

import com.taskmanager.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {
    List<ProjectMember> findByProject_IdOrderByJoinedAtAsc(UUID projectId);
    long countByProject_Id(UUID projectId);
    boolean existsByProject_IdAndUser_Id(UUID projectId, UUID userId);
    void deleteByProject_IdAndUser_Id(UUID projectId, UUID userId);
}
