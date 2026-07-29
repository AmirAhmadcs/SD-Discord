package com.project.chat.repository;

import com.project.chat.entity.Server;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ServerRepository extends JpaRepository<Server, Long> {

    @Query("SELECT s FROM Server s JOIN s.members m WHERE m.username = :username")
    List<Server> findServersByUsername(@Param("username") String username);
}