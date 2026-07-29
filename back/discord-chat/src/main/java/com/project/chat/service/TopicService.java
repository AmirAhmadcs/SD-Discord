package com.project.chat.service;

import com.project.chat.dto.CreateTopicRequest;
import com.project.chat.entity.Channel;
import com.project.chat.entity.Message;
import com.project.chat.entity.ServerMember;
import com.project.chat.entity.Topic;
import com.project.chat.feign.MediaClient;
import com.project.chat.repository.ChannelRepository;
import com.project.chat.repository.MessageRepository;
import com.project.chat.repository.ServerMemberRepository;
import com.project.chat.repository.TopicRepository;
import com.project.chat.utils.PermissionUtil; // ✅ اضافه شد
import jakarta.transaction.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TopicService {

    private final TopicRepository topicRepository;
    private final ChannelRepository channelRepository;
    private final MessageRepository messageRepository;
    private final ServerMemberRepository memberRepository;
    private final MediaClient mediaClient;
    private final PermissionUtil permissionUtil; // ✅ اضافه شد

    public Topic createTopic(CreateTopicRequest request, String username) {
        Channel channel = channelRepository.findById(request.getChannelId())
            .orElseThrow(() -> new RuntimeException("Channel not found!"));

        if (channel.getServer() == null) throw new RuntimeException("Cannot create topics in DM.");

        // ✅ چک کردن دسترسی ایجاد تاپیک (فقط کسانی که این پرامیشن را دارند - مثلا ادمین‌ها)
        ServerMember member = memberRepository.findByServerIdAndUsername(channel.getServer().getId(), username)
            .orElseThrow(() -> new RuntimeException("Only server members can create topics."));

        if (!permissionUtil.hasPermission(member.getRole(), "MANAGE_TOPICS")) {
            throw new RuntimeException("You don't have permission to create topics (MANAGE_TOPICS required).");
        }

        return topicRepository.save(Topic.builder()
            .name(request.getName())
            .channel(channel)
            .build());
    }

    @Transactional
    public void deleteTopic(Long topicId, String username) {
        Topic topic = topicRepository.findById(topicId).orElseThrow(() -> new RuntimeException("Topic not found!"));
        Channel channel = topic.getChannel();

        if (channel.getServer() == null) throw new RuntimeException("Cannot delete topics in DM.");

        // ✅ چک کردن دسترسی حذف تاپیک
        ServerMember member = memberRepository.findByServerIdAndUsername(channel.getServer().getId(), username)
            .orElseThrow(() -> new RuntimeException("Only server members can delete topics."));

        if (!permissionUtil.hasPermission(member.getRole(), "MANAGE_TOPICS")) {
            throw new RuntimeException("You don't have permission to delete topics (MANAGE_TOPICS required).");
        }

        List<Message> messages = messageRepository.findByTopicId(topicId);
        for (Message msg : messages) {
            if (msg.getAttachmentFileName() != null && !msg.getAttachmentFileName().isEmpty()) {
                try { mediaClient.deleteFile(msg.getAttachmentFileName()); } catch (Exception e) { System.err.println("Failed to delete media: " + e.getMessage()); }
            }
        }
        topicRepository.delete(topic);
    }
}