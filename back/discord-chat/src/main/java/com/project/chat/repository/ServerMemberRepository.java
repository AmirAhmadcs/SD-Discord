package com.project.chat.repository;

import com.project.chat.entity.ServerMember;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServerMemberRepository extends JpaRepository<ServerMember, Long> {

    boolean existsByServerIdAndUsername(Long serverId, String username);

    Optional<ServerMember> findByServerIdAndUsername(Long serverId, String username);
}