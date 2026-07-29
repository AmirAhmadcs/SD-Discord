package com.project.chat.service;

import com.project.chat.dto.MessageSearchResponse;
import com.project.chat.dto.SendMessageRequest;

import com.project.chat.entity.Channel;
import com.project.chat.entity.DirectChat;
import com.project.chat.entity.Message;
import com.project.chat.entity.ServerMember;
import com.project.chat.entity.Topic;
import com.project.chat.entity.enums.ChannelType;
import com.project.chat.entity.enums.MessageStatus;
import com.project.chat.feign.MediaClient;
import com.project.chat.repository.ChannelRepository;
import com.project.chat.repository.DirectChatRepository;
import com.project.chat.repository.MessageRepository;
import com.project.chat.repository.ServerMemberRepository;
import com.project.chat.repository.TopicRepository;
import com.project.chat.utils.CursorUtils;
import com.project.chat.utils.PermissionUtil;
import jakarta.transaction.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final TopicRepository topicRepository;
    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final MediaClient mediaClient;
    private final ServerMemberRepository serverMemberRepository;
    private final DirectChatRepository directChatRepository;
    private final ChannelService channelService;
    private final PermissionUtil permissionUtil; // ✅ اضافه شد

    private void checkAccessToChannel(Channel channel, String username) {
        if (channel.getType() == ChannelType.DIRECT) {
            DirectChat dm = directChatRepository.findByChannelId(channel.getId())
                .orElseThrow(() -> new RuntimeException("Direct chat info not found!"));
            if (!dm.getParticipantOne().equals(username) && !dm.getParticipantTwo().equals(username)) {
                throw new RuntimeException("Access denied: You are not part of this private chat.");
            }
        } else {
            if (channel.getServer() == null) throw new RuntimeException("Channel configuration error.");
            if (!serverMemberRepository.existsByServerIdAndUsername(channel.getServer().getId(), username)) {
                throw new RuntimeException("Access denied: Not a member.");
            }
        }
    }

    public Message sendMessage(SendMessageRequest request, String username) {
        Channel channel = channelRepository.findById(request.getChannelId())
            .orElseThrow(() -> new RuntimeException("Channel not found!"));

        checkAccessToChannel(channel, username);

        boolean hasAttachment = request.getAttachmentFileName() != null && !request.getAttachmentFileName().isEmpty();
        channelService.checkMediaPermission(request.getChannelId(), username, hasAttachment);

        Topic topic = null;
        if (request.getTopicId() != null) {
            topic = topicRepository.findById(request.getTopicId())
                .orElseThrow(() -> new RuntimeException("Topic not found!"));
        }

        Message message = Message.builder()
            .content(request.getContent())
            .senderUsername(username)
            .channel(channel)
            .topic(topic) // ✅ اتصال تاپیک
            .attachmentFileName(request.getAttachmentFileName()) // ✅ این خط را اضافه کن تا فایل ها هم ذخیره شوند
            .build();

        return messageRepository.save(message);
    }

    public List<Message> getChannelMessages(Long channelId, String username) {
        Channel channel = channelRepository.findById(channelId).orElseThrow(() -> new RuntimeException("Channel not found!"));
        checkAccessToChannel(channel, username);
        return messageRepository.findByChannelIdOrderByCreatedAtAsc(channelId);
    }

    public MessageSearchResponse searchMessages(Long channelId, String keyword, String cursor, int limit, String username) {
        Channel channel = channelRepository.findById(channelId).orElseThrow(() -> new RuntimeException("Channel not found!"));
        checkAccessToChannel(channel, username);

        Pageable pageable = PageRequest.of(0, limit);
        List<Message> messages;
        long[] decoded = CursorUtils.decodeCursor(cursor);

        if (decoded == null) {
            messages = messageRepository.searchInContentOrFilenameWithoutCursor(channelId, keyword, pageable);
        } else {
            messages = messageRepository.searchInContentOrFilenameWithCursor(channelId, keyword, decoded[0], decoded[1], pageable);
        }

        String nextCursor = null;
        if (!messages.isEmpty()) {
            Message lastMessage = messages.get(messages.size() - 1);
            nextCursor = CursorUtils.encodeCursor(lastMessage.getCreatedAt(), lastMessage.getId());
        }
        return MessageSearchResponse.builder().messages(messages).nextCursor(nextCursor).build();
    }

    @Transactional
    public Message editMessage(Long messageId, String newContent, String username) {
        Message message = messageRepository.findById(messageId).orElseThrow(() -> new RuntimeException("Message not found!"));
        if (!message.getSenderUsername().equals(username)) throw new RuntimeException("You can only edit your own messages!");
        message.setContent(newContent);
        message.setIsEdited(true);
        return messageRepository.save(message);
    }

    @Transactional
    public void deleteMessage(Long messageId, String username) {
        Message message = messageRepository.findById(messageId).orElseThrow(() -> new RuntimeException("Message not found!"));
        boolean hasPermission = false;

        if (message.getSenderUsername().equals(username)) {
            // ✅ اگر فرستنده است، چک میکنیم آیا پرامیشن حذف پیام خودش را دارد
            if (message.getChannel().getType() == ChannelType.DIRECT) {
                hasPermission = true; // در دایرکت فرستنده همیشه میتواند حذف کند
            } else {
                ServerMember member = serverMemberRepository.findByServerIdAndUsername(message.getChannel().getServer().getId(), username).orElse(null);
                hasPermission = member != null && permissionUtil.hasPermission(member.getRole(), "DELETE_OWN_MESSAGE");
            }
        } else {
            // ✅ اگر فرستنده نیست، چک میکنیم آیا پرامیشن حذف پیام دیگران را دارد
            if (message.getChannel().getType() != ChannelType.DIRECT) {
                ServerMember member = serverMemberRepository.findByServerIdAndUsername(message.getChannel().getServer().getId(), username).orElse(null);
                hasPermission = member != null && permissionUtil.hasPermission(member.getRole(), "DELETE_ANY_MESSAGE");
            }
        }

        if (!hasPermission) throw new RuntimeException("You do not have permission to delete this message!");

        if (message.getAttachmentFileName() != null && !message.getAttachmentFileName().isEmpty()) {
            try { mediaClient.deleteFile(message.getAttachmentFileName()); } catch (Exception e) { System.err.println("Failed to delete media: " + e.getMessage()); }
        }
        messageRepository.delete(message);
    }

    public Message scheduleMessage(SendMessageRequest request, Long scheduledAt, String username) {
        if (scheduledAt <= System.currentTimeMillis()) throw new RuntimeException("Scheduled time must be in the future.");
        Channel channel = channelRepository.findById(request.getChannelId()).orElseThrow(() -> new RuntimeException("Channel not found!"));
        checkAccessToChannel(channel, username);
        boolean hasAttachment = request.getAttachmentFileName() != null && !request.getAttachmentFileName().isEmpty();
        channelService.checkMediaPermission(request.getChannelId(), username, hasAttachment);

        return messageRepository.save(Message.builder()
            .content(request.getContent()).senderUsername(username).channel(channel)
            .attachmentFileName(request.getAttachmentFileName())
            .status(MessageStatus.SCHEDULED).scheduledAt(scheduledAt).build());
    }

    @Transactional
    public Message editScheduledMessage(Long messageId, String newContent, Long newScheduledAt, String username) {
        Message message = messageRepository.findById(messageId).orElseThrow(() -> new RuntimeException("Message not found!"));
        if (!message.getSenderUsername().equals(username)) throw new RuntimeException("Not your message.");
        if (message.getStatus() != MessageStatus.SCHEDULED) throw new RuntimeException("Message is already sent or canceled.");
        if (newScheduledAt <= System.currentTimeMillis()) throw new RuntimeException("Time must be in future.");
        message.setContent(newContent);
        message.setScheduledAt(newScheduledAt);
        return messageRepository.save(message);
    }

    @Transactional
    public void cancelScheduledMessage(Long messageId, String username) {
        Message message = messageRepository.findById(messageId).orElseThrow(() -> new RuntimeException("Message not found!"));
        if (!message.getSenderUsername().equals(username)) throw new RuntimeException("Not your message.");
        if (message.getStatus() != MessageStatus.SCHEDULED) throw new RuntimeException("Can only cancel scheduled messages.");
        message.setStatus(MessageStatus.CANCELED);
        messageRepository.save(message);
    }
}