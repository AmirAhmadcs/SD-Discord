package com.project.chat.service;

import com.project.chat.dto.ChangeRoleRequest;
import com.project.chat.dto.CreateChannelRequest;
import com.project.chat.entity.Channel;
import com.project.chat.entity.Role;
import com.project.chat.entity.Server;
import com.project.chat.entity.ServerMember;
import com.project.chat.repository.ChannelRepository;
import com.project.chat.repository.MessageRepository;
import com.project.chat.repository.RoleRepository;
import com.project.chat.repository.ServerMemberRepository;
import com.project.chat.repository.ServerRepository;
import com.project.chat.utils.PermissionUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final ServerRepository serverRepository;
    private final ServerMemberRepository memberRepository;
    private final MessageRepository messageRepository;
    private final RoleRepository roleRepository; // ✅ اضافه شد
    private final PermissionUtil permissionUtil; // ✅ اضافه شد

    public Channel createChannel(CreateChannelRequest request, String username) {
        if (!memberRepository.existsByServerIdAndUsername(request.getServerId(), username)) {
            throw new RuntimeException("You are not a member of this server!");
        }
        Server server = serverRepository.findById(request.getServerId())
            .orElseThrow(() -> new RuntimeException("Server not found!"));

        return channelRepository.save(Channel.builder()
            .name(request.getName())
            .type(request.getType())
            .server(server)
            .build());
    }

    @Transactional
    public void changeMemberRole(Long channelId, ChangeRoleRequest request, String requesterUsername) {
        Channel channel = channelRepository.findById(channelId)
            .orElseThrow(() -> new RuntimeException("Channel not found!"));

        if (channel.getServer() == null) throw new RuntimeException("Roles cannot be changed in DM.");
        Long serverId = channel.getServer().getId();

        ServerMember requester = memberRepository.findByServerIdAndUsername(serverId, requesterUsername)
            .orElseThrow(() -> new RuntimeException("You are not a member."));

        // ✅ فقط کسی که دسترسی MANAGE_ROLES دارد می‌تواند نقش عوض کند
        if (!permissionUtil.hasPermission(requester.getRole(), "MANAGE_ROLES")) {
            throw new RuntimeException("You don't have permission to manage roles (MANAGE_ROLES required).");
        }

        ServerMember target = memberRepository.findByServerIdAndUsername(serverId, request.getTargetUsername())
            .orElseThrow(() -> new RuntimeException("Target user is not a member."));

        if (requester.getUsername().equals(target.getUsername())) throw new RuntimeException("You cannot change your own role.");

        // ✅ جلوگیری از تغییر نقش اونر (چک کردن با نام نقش)
        if (target.getRole().getName().equals("OWNER")) {
            throw new RuntimeException("You cannot change the role of the server OWNER.");
        }

        // ✅ پیدا کردن نقش جدید از دیتابیس (فرض میکنیم ChangeRoleRequest حالا یک Long newRoleId دارد)
        Role newRole = roleRepository.findByIdAndServerId(request.getNewRoleId(), serverId)
            .orElseThrow(() -> new RuntimeException("Target role not found in this server."));

        // ✅ جلوگیری از اینکه کسی نقش OWNER را به غیر بدهد (فقط سیستم اجازه میدد اونر اونر بماند)
        if (newRole.getName().equals("OWNER")) {
            throw new RuntimeException("OWNER role cannot be assigned manually.");
        }

        target.setRole(newRole);
        memberRepository.save(target);
    }

    @Transactional
    public Channel updateChannelName(Long channelId, String newName, String username) {
        Channel channel = channelRepository.findById(channelId).orElseThrow(() -> new RuntimeException("Channel not found!"));
        if (channel.getServer() == null) throw new RuntimeException("Cannot edit DM channels.");

        // ✅ چک کردن پرامیشن
        checkPermission(channel.getServer().getId(), username, "MANAGE_CHANNELS");

        channel.setName(newName);
        return channelRepository.save(channel);
    }

    @Transactional
    public void deleteChannel(Long channelId, String username) {
        Channel channel = channelRepository.findById(channelId).orElseThrow(() -> new RuntimeException("Channel not found!"));
        if (channel.getServer() == null) throw new RuntimeException("Cannot delete DM channels.");

        checkPermission(channel.getServer().getId(), username, "MANAGE_CHANNELS");
        messageRepository.deleteAllByChannelIdAndTopicIdIsNull(channelId);
        channelRepository.delete(channel);
    }

    @Transactional
    public void toggleMediaRestriction(Long channelId, boolean isRestricted, String username) {
        Channel channel = channelRepository.findById(channelId).orElseThrow(() -> new RuntimeException("Channel not found!"));
        if (channel.getServer() == null) throw new RuntimeException("Cannot restrict media in DM.");

        checkPermission(channel.getServer().getId(), username, "MANAGE_CHANNELS");
        channel.setMediaRestricted(isRestricted);
        channelRepository.save(channel);
    }

    public void checkMediaPermission(Long channelId, String username, boolean hasAttachment) {
        if (!hasAttachment) return;

        Channel channel = channelRepository.findById(channelId).orElseThrow(() -> new RuntimeException("Channel not found!"));
        if (Boolean.TRUE.equals(channel.getMediaRestricted()) && channel.getServer() != null) {
            // ✅ چک کردن پرامیشن ارسال فایل
            checkPermission(channel.getServer().getId(), username, "ATTACH_FILES");
        }
    }

    // ✅ یک متد کمکی تمیز برای چک کردن هر دسترسی
    private void checkPermission(Long serverId, String username, String permissionKey) {
        ServerMember member = memberRepository.findByServerIdAndUsername(serverId, username)
            .orElseThrow(() -> new RuntimeException("You are not a member of this server."));

        if (!permissionUtil.hasPermission(member.getRole(), permissionKey)) {
            throw new RuntimeException("Access denied. You lack the required permission: " + permissionKey);
        }
    }
}