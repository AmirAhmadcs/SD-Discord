package com.project.chat.repository;

import com.project.chat.entity.Message;
import com.project.chat.entity.enums.MessageStatus;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByChannelIdOrderByCreatedAtAsc(Long channelId);

    List<Message> findByChannelIdAndContentContainingIgnoreCaseOrderByCreatedAtDescIdDesc(Long channelId, String keyword, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.channel.id = :channelId AND LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) AND (m.createdAt < :cursorTime OR (m.createdAt = :cursorTime AND m.id < :cursorId)) ORDER BY m.createdAt DESC, m.id DESC")
    List<Message> searchWithCompositeCursor(
        @Param("channelId") Long channelId,
        @Param("keyword") String keyword,
        @Param("cursorTime") Long cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable);

    List<Message> findByTopicId(Long topicId);

    void deleteAllByChannelIdAndTopicIdIsNull(Long channelId);

    @Query("SELECT m FROM Message m WHERE m.channel.id = :channelId AND " +
        "(LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "LOWER(m.attachmentFileName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
        "ORDER BY m.createdAt DESC, m.id DESC")
    List<Message> searchInContentOrFilenameWithoutCursor(
        @Param("channelId") Long channelId,
        @Param("keyword") String keyword,
        Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.channel.id = :channelId AND " +
        "(LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "LOWER(m.attachmentFileName) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
        "(m.createdAt < :cursorTime OR (m.createdAt = :cursorTime AND m.id < :cursorId)) " +
        "ORDER BY m.createdAt DESC, m.id DESC")
    List<Message> searchInContentOrFilenameWithCursor(
        @Param("channelId") Long channelId,
        @Param("keyword") String keyword,
        @Param("cursorTime") Long cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable);

    List<Message> findByStatusAndScheduledAtBefore(MessageStatus status, Long currentTime);
}