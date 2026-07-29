package com.project.chat.service;

import com.project.chat.dto.CreateServerRequest;
import com.project.chat.entity.Channel;
import com.project.chat.entity.Role;
import com.project.chat.entity.Server;
import com.project.chat.entity.ServerMember;
import com.project.chat.entity.enums.ChannelType;
import com.project.chat.feign.AuthClient;
import com.project.chat.repository.MessageRepository;
import com.project.chat.repository.RoleRepository;
import com.project.chat.repository.ServerMemberRepository;
import com.project.chat.repository.ServerRepository;
import com.project.chat.utils.PermissionUtil;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ServerService {

    private final ServerRepository serverRepository;
    private final ServerMemberRepository memberRepository;
    private final AuthClient authClient;
    private final MessageRepository messageRepository;
    private final RoleRepository roleRepository; // ✅ اضافه شد
    private final PermissionUtil permissionUtil;

    @Transactional
    public Server createServer(CreateServerRequest request, String username) {
        Server server = Server.builder()
            .name(request.getName())
            .iconUrl(request.getIconUrl())
            .ownerUsername(username)
            .channels(new ArrayList<>())
            .members(new ArrayList<>())
            .build();

        Channel defaultChannel = Channel.builder()
            .name("general")
            .type(ChannelType.TEXT)
            .server(server)
            .build();
        server.getChannels().add(defaultChannel);

        // ۱. ابتدا سرور ذخیره می‌شود تا آیدی بگیرد
        Server savedServer = serverRepository.save(server);

        // ۲. نقش‌های پیش‌فرض برای این سرور ساخته می‌شود
        createDefaultRolesForServer(savedServer);

        // ۳. اضافه کردن اعضای اولیه
        if (request.getInitialMemberUsernames() != null && !request.getInitialMemberUsernames().isEmpty()) {
            for (String memberUsername : request.getInitialMemberUsernames()) {
                if (!memberUsername.equals(username)) {
                    addMemberToServer(savedServer.getId(), memberUsername);
                }
            }
        }

        return savedServer;
    }

    @Transactional(readOnly = true)
    public Server getServerById(Long serverId) {
        return serverRepository.findById(serverId)
            .orElseThrow(() -> new RuntimeException("Server not found!"));
    }

    // ✅ این انوتیشن رو اضافه کن
    @Transactional(readOnly = true)
    public List<Server> getUserServers(String username) {
        return serverRepository.findServersByUsername(username);
    }

    @Transactional
    public ServerMember addMemberToServer(Long serverId, String targetUsername) {
        boolean userExists = authClient.checkUserExists(targetUsername);
        if (!userExists) {
            throw new RuntimeException("User with this username does not exist in the system!");
        }

        boolean isAllowed = authClient.isAllowedToBeAddedToGroups(targetUsername);
        if (!isAllowed) {
            throw new RuntimeException("This user has restricted others from adding them to servers/groups.");
        }

        Server server = serverRepository.findById(serverId)
            .orElseThrow(() -> new RuntimeException("Server not found!"));

        if (memberRepository.existsByServerIdAndUsername(serverId, targetUsername)) {
            throw new RuntimeException("This user is already a member of the server!");
        }

        Role memberRole = roleRepository.findByServerIdAndName(serverId, "MEMBER")
            .orElseThrow(() -> new RuntimeException("Default MEMBER role not found!"));

        ServerMember newMember = ServerMember.builder()
            .username(targetUsername)
            .role(memberRole)
            .server(server)
            .build();

        return memberRepository.save(newMember);
    }

    @Transactional
    public Server updateServerName(Long serverId, String newName, String username) {
        Server server = getServerById(serverId);
        boolean isMember = memberRepository.existsByServerIdAndUsername(serverId, username);
        if (!isMember) {
            throw new RuntimeException("You must be a member to edit the server name.");
        }
        server.setName(newName);
        return serverRepository.save(server);
    }

    @Transactional
    public void deleteServer(Long serverId, String username) {
        Server server = getServerById(serverId);
        boolean isMember = memberRepository.existsByServerIdAndUsername(serverId, username);
        if (!isMember) {
            throw new RuntimeException("You must be a member to delete the server.");
        }

        for (Channel channel : server.getChannels()) {
            messageRepository.deleteAllByChannelIdAndTopicIdIsNull(channel.getId());
        }
        serverRepository.delete(server);
    }

    @Transactional
    public void createDefaultRolesForServer(Server server) {
        Role ownerRole = Role.builder().name("OWNER").server(server).permissionsJson("[\"*\"]").build();

        // ✅ "BAN_MEMBERS" به این خط اضافه شد
        Role adminRole = Role.builder().name("ADMIN").server(server).permissionsJson("[\"SEND_TEXT\", \"ATTACH_FILES\", \"DELETE_OWN_MESSAGE\", \"DELETE_ANY_MESSAGE\", \"MANAGE_TOPICS\", \"MANAGE_CHANNELS\", \"MENTION_EVERYONE\", \"BAN_MEMBERS\"]").build();

        Role memberRole = Role.builder().name("MEMBER").server(server).permissionsJson("[\"SEND_TEXT\", \"ATTACH_FILES\", \"DELETE_OWN_MESSAGE\"]").build();

        roleRepository.saveAll(List.of(ownerRole, adminRole, memberRole));

        ServerMember ownerMember = ServerMember.builder()
            .username(server.getOwnerUsername())
            .server(server)
            .role(ownerRole)
            .build();
        memberRepository.save(ownerMember);
    }

    @Transactional
    public void leaveServer(Long serverId, String username) {
        Server server = getServerById(serverId);

        // ۱. چک میکنیم که اونر نباشد (اونر حق لفت دادن ندارد)
        if (server.getOwnerUsername().equals(username)) {
            throw new RuntimeException("The server OWNER cannot leave the server.");
        }

        // ۲. پیدا کردن عضو و پاک کردن آن
        ServerMember member = memberRepository.findByServerIdAndUsername(serverId, username)
            .orElseThrow(() -> new RuntimeException("You are not a member of this server."));

        memberRepository.delete(member);
    }

    @Transactional
    public void banMember(Long serverId, String targetUsername, String requesterUsername) {
        Server server = getServerById(serverId);

        // ۱. پیدا کردن درخواست‌دهنده
        ServerMember requester = memberRepository.findByServerIdAndUsername(serverId, requesterUsername)
            .orElseThrow(() -> new RuntimeException("You are not a member of this server."));

        // ۲. چک کردن پرامیشن BAN_MEMBERS (اونر چون * دارد اینجا پاس می‌شود)
        if (!permissionUtil.hasPermission(requester.getRole(), "BAN_MEMBERS")) {
            throw new RuntimeException("You don't have permission to ban members (BAN_MEMBERS required).");
        }

        // ۳. پیدا کردن شخصی که قرار است بن شود
        ServerMember target = memberRepository.findByServerIdAndUsername(serverId, targetUsername)
            .orElseThrow(() -> new RuntimeException("Target user is not a member of this server."));

        // ۴. جلوگیری از بن کردن خودت
        if (requester.getUsername().equals(target.getUsername())) {
            throw new RuntimeException("You cannot ban yourself.");
        }

        // ۵. منطق سلسله مراتبی بر اساس پرامیشن‌ها (نه اسم نقش)
        boolean requesterIsOwner = permissionUtil.hasPermission(requester.getRole(), "*");
        boolean targetHasBanPermission = permissionUtil.hasPermission(target.getRole(), "BAN_MEMBERS");
        boolean targetIsOwner = permissionUtil.hasPermission(target.getRole(), "*");

        // اگر طرف مقصد اونر است (پرامیشن * دارد) -> هیچکس نمی‌تواند اونر را بن کند
        if (targetIsOwner) {
            throw new RuntimeException("You cannot ban the server OWNER.");
        }

        // اگر طرف مقصد دسترسی بن کردن دارد (مثلا ادمین است) و درخواست دهنده اونر نیست
        // این یعنی: ادمین نتواند ادمین دیگر را بن کند، ولی اونر بتواند ادمین را بن کند
        if (targetHasBanPermission && !requesterIsOwner) {
            throw new RuntimeException("You cannot ban another member who has banning privileges.");
        }

        // ۶. حذف شخص از سرور (عملیات بن در این پروژه)
        memberRepository.delete(target);
    }
}