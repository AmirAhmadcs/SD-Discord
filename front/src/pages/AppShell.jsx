import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import * as realtime from "../db/realtime";
import NavRail from "../components/layout/NavRail";
import ListPanel from "../components/layout/ListPanel";
import ChatArea from "../components/layout/ChatArea";
import DetailsPanel from "../components/layout/DetailsPanel";
import CreateGroupModal from "../components/modals/CreateGroupModal";
import CreateChannelModal from "../components/modals/CreateChannelModal";
import StartDmModal from "../components/modals/StartDmModal";
import MembersModal from "../components/modals/MembersModal";
import RolesModal from "../components/modals/RolesModal";
import PromptModal from "../components/modals/PromptModal";
import SettingsModal from "../components/modals/SettingsModal";
import ProfileModal from "../components/modals/ProfileModal";
import NotificationsPanel from "../components/modals/NotificationsPanel";
import ScheduleMessageModal from "../components/modals/ScheduleMessageModal";
import ScheduledMessagesModal from "../components/modals/ScheduledMessagesModal";
import ConfirmDialog from "../components/ConfirmDialog";

export default function AppShell() {
  const { db, currentUser, store } = useStore();
  const navigate = useNavigate();

  const [section, setSection] = useState("dm");
  const [selectedDmId, setSelectedDmId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [topicByChannel, setTopicByChannel] = useState({});
  const [showDetails, setShowDetails] = useState(true);
  const [modal, setModal] = useState(null); // { type, ... }

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    realtime.connectRealtime();

    return () =>
      realtime.disconnectRealtime();
  }, [currentUser?.id]);

  const activeChannelId =
    section === "dm"
      ? selectedDmId
      : section === "channel"
        ? selectedChannelId
        : null;

  useEffect(() => {
    realtime.setActiveChannel(
      activeChannelId,
    );
  }, [activeChannelId]);

  useEffect(() => {
    if (section === "dm" && selectedDmId) {
      store.loadMessages("dm", selectedDmId);
    }

    if (section === "channel" && selectedChannelId) {
      store.loadMessages("channel", selectedChannelId);
    }
  }, [section, selectedDmId, selectedChannelId, store]);

  if (!currentUser) return null;

  const otherUsers = store.listOtherUsers(currentUser.id);
  const openProfile = async (userId) => {
    await store.fetchUser(userId);

    setModal({
      type: "profile",
      userId,
    });
  };
  const openSettings = () => setModal({ type: "settings" });

  // ---- Section data -------------------------------------------------------
  const dms = store.listDmsForUser(currentUser.id).map((dm) => {
    const otherId = dm.memberIds.find((id) => id !== currentUser.id);
    const other = store.getUser(otherId);
    return {
      id: dm.id,
      label: other?.name || "Unknown user",
      sublabel: other ? `@${other.username}` : "",
      online: true,
    };
  });
  const groups = store.listGroupsForUser(currentUser.id).map((g) => ({
    id: g.id,
    label: g.name,
    sublabel: `${g.memberIds.length} members`,
  }));
  const channels = store.listChannelsForUser(currentUser.id).map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: `${c.memberIds.length} members`,
  }));

  const selectedDm = selectedDmId ? store.getDm(selectedDmId) : null;
  const selectedGroup = selectedGroupId
    ? store.getGroup(selectedGroupId)
    : null;
  const selectedChannel = selectedChannelId
    ? store.getChannel(selectedChannelId)
    : null;

  const activeTopicId =
    selectedChannel &&
    (topicByChannel[selectedChannel.id] ||
      Object.keys(selectedChannel.topics)[0] ||
      null);

  const channelPerms = selectedChannel
    ? store.getChannelPermissions(selectedChannel, currentUser.id)
    : null;

  function openCreateModal() {
    if (section === "dm") setModal({ type: "startDm" });
    if (section === "group") setModal({ type: "createGroup" });
    if (section === "channel") setModal({ type: "createChannel" });
  }

  // ---- Derived view model for the currently open conversation ------------
  let view = null;

  if (section === "dm" && selectedDm) {
    const otherId = selectedDm.memberIds.find((id) => id !== currentUser.id);
    const other = store.getUser(otherId);
    const messages = store.listMessages("dm", selectedDm.id);
    view = {
      title: other?.name || "Unknown user",
      subtitle: `@${other?.username || ""}`,
      messages,
      outbox: store.listOutboxForConversation("dm", selectedDm.id, undefined),
      composerDisabled: false,
      mediaDisabled: false,
      isManager: false,
      titleClickable: true,
      onTitleClick: () => openProfile(otherId),
      onSend: (payload) =>
        store.sendOrQueueMessage({
          scope: "dm",
          scopeId: selectedDm.id,
          senderId: currentUser.id,
          ...payload,
        }),
      details: {
        title: other?.name || "Unknown user",
        subtitle: `@${other?.username || ""}`,
        createdAt: selectedDm.createdAt,
        onOpenProfile: () => openProfile(otherId),
      },
      scheduleTarget: {
        scope: "dm",
        scopeId: selectedDm.id,
        topicId: undefined,
      },
    };
  }

  if (section === "group" && selectedGroup) {
    const messages = store.listMessages("group", selectedGroup.id);
    const isOwner = selectedGroup.ownerId === currentUser.id;
    view = {
      title: selectedGroup.name,
      subtitle: `${selectedGroup.memberIds.length} members`,
      messages,
      outbox: store.listOutboxForConversation(
        "group",
        selectedGroup.id,
        undefined,
      ),
      composerDisabled: false,
      mediaDisabled: false,
      isManager: isOwner,
      onSend: (payload) =>
        store.sendOrQueueMessage({
          scope: "group",
          scopeId: selectedGroup.id,
          senderId: currentUser.id,
          ...payload,
        }),
      details: {
        title: selectedGroup.name,
        subtitle: `${selectedGroup.memberIds.length} members`,
        createdAt: selectedGroup.createdAt,
        canRename: true,
        canDelete: true,
      },
      scheduleTarget: {
        scope: "group",
        scopeId: selectedGroup.id,
        topicId: undefined,
      },
    };
  }

  if (section === "channel" && selectedChannel) {
    const messages = activeTopicId
      ? store.listMessages("channel", selectedChannel.id, activeTopicId)
      : [];
    const topics = Object.values(selectedChannel.topics).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
    view = {
      title: selectedChannel.name,
      subtitle: `${selectedChannel.memberIds.length} members`,
      messages,
      outbox: activeTopicId
        ? store.listOutboxForConversation(
            "channel",
            selectedChannel.id,
            activeTopicId,
          )
        : [],
      composerDisabled: !channelPerms.post,
      composerDisabledReason:
        "Your role doesn't allow posting in this channel.",
      mediaDisabled:
        !selectedChannel.mediaAllowed &&
        selectedChannel.ownerId !== currentUser.id,
      mediaDisabledReason:
        "Media sharing is disabled in this channel by the admin.",
      isManager: channelPerms.deleteAnyMessage,
      topics,
      activeTopicId,
      canManageTopics: channelPerms.manageTopics,
      onSend: (payload) =>
        activeTopicId
          ? store.sendOrQueueMessage({
              scope: "channel",
              scopeId: selectedChannel.id,
              topicId: activeTopicId,
              senderId: currentUser.id,
              ...payload,
            })
          : { ok: false, error: "Create a topic first." },
      details: {
        title: selectedChannel.name,
        subtitle: `${selectedChannel.memberIds.length} members`,
        createdAt: selectedChannel.createdAt,
        canRename: channelPerms.manageChannel,
        canDelete: channelPerms.manageChannel,
        canToggleMedia: channelPerms.manageChannel,
        canManageRoles: channelPerms.manageRoles,
        mediaAllowed: selectedChannel.mediaAllowed,
      },
      scheduleTarget: {
        scope: "channel",
        scopeId: selectedChannel.id,
        topicId: activeTopicId,
      },
    };
  }

  const mediaMessages = view
    ? view.messages.filter((m) => m.kind !== "text")
    : [];

  function selectItem(id) {
    if (section === "dm") setSelectedDmId(id);
    if (section === "group") setSelectedGroupId(id);
    if (section === "channel") setSelectedChannelId(id);
  }

  function handleEditMessage(messageId, text) {
    return store.editMessage(messageId, currentUser.id, { text });
  }

  function handleDeleteMessage(messageId) {
    setModal({ type: "confirmDeleteMessage", messageId });
  }

  function resolveScheduledDestination(entry) {
    if (entry.scope === "dm") {
      const dm = store.getDm(entry.scopeId);
      const otherId = dm?.memberIds.find((id) => id !== entry.authorId);
      const other = otherId ? store.getUser(otherId) : null;
      return `DM \u2022 ${other?.name || "Unknown user"}`;
    }
    if (entry.scope === "group") {
      const group = store.getGroup(entry.scopeId);
      return `Group \u2022 ${group?.name || "Unknown group"}`;
    }
    if (entry.scope === "channel") {
      const channel = store.getChannel(entry.scopeId);
      const topic = channel?.topics[entry.topicId];
      return `#${channel?.name || "Unknown channel"}${topic ? ` \u2022 ${topic.name}` : ""}`;
    }
    return "Unknown conversation";
  }

  const unreadNotifications = store.unreadNotificationCount(currentUser.id);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {store.isOffline() && (
        <div
          style={{
            background: "rgba(245, 183, 74, 0.14)",
            color: "#f5b74a",
            fontSize: 12.5,
            textAlign: "center",
            padding: "6px 12px",
            flexShrink: 0,
          }}
        >
          You're offline — new messages will be queued and sent automatically
          once you're back online.
        </div>
      )}

      {!store.isOffline() && !db.realtimeConnected && (
        <div
          style={{
            background: "rgba(245, 183, 74, 0.14)",
            color: "#f5b74a",
            fontSize: 12.5,
            textAlign: "center",
            padding: "6px 12px",
            flexShrink: 0,
          }}
        >
          Connecting to live updates…
        </div>
      )}

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <NavRail
          section={section}
          onSection={setSection}
          onOpenProfile={openSettings}
          onOpenSettings={openSettings}
          onOpenNotifications={() => setModal({ type: "notifications" })}
          onOpenScheduled={() => setModal({ type: "scheduled" })}
          unreadNotifications={unreadNotifications}
          onLogout={async () => {
            await store.logout();

            navigate("/login", {
              replace: true,
            });
          }}
          currentUser={currentUser}
        />

        <ListPanel
          section={section}
          items={
            section === "dm" ? dms : section === "group" ? groups : channels
          }
          selectedId={
            section === "dm"
              ? selectedDmId
              : section === "group"
                ? selectedGroupId
                : selectedChannelId
          }
          onSelect={selectItem}
          onCreate={openCreateModal}
          createLabel={
            section === "dm"
              ? "New message"
              : section === "group"
                ? "Create group"
                : "Create channel"
          }
        />

        {view ? (
          <>
            <ChatArea
              title={view.title}
              subtitle={view.subtitle}
              titleClickable={view.titleClickable}
              onTitleClick={view.onTitleClick}
              messages={view.messages}
              outbox={view.outbox}
              getUser={store.getUser}
              currentUserId={currentUser.id}
              isManager={view.isManager}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onOpenProfile={openProfile}
              onSend={view.onSend}
              onOpenSchedule={
                view.composerDisabled
                  ? undefined
                  : () => setModal({ type: "schedule" })
              }
              composerDisabled={view.composerDisabled}
              composerDisabledReason={view.composerDisabledReason}
              mediaDisabled={view.mediaDisabled}
              mediaDisabledReason={view.mediaDisabledReason}
              topics={view.topics}
              activeTopicId={view.activeTopicId}
              onSelectTopic={(topicId) =>
                setTopicByChannel((s) => ({
                  ...s,
                  [selectedChannel.id]: topicId,
                }))
              }
              onCreateTopic={() => setModal({ type: "createTopic" })}
              onDeleteTopic={(topicId) =>
                setModal({ type: "confirmDeleteTopic", topicId })
              }
              canManageTopics={view.canManageTopics}
              onToggleDetails={() => setShowDetails((s) => !s)}
              onRetryOutbox={(id) => store.retryOutboxItem(id)}
              onRemoveOutbox={(id) => store.removeOutboxItem(id)}
            />
            {showDetails && (
              <DetailsPanel
                section={section}
                title={view.details.title}
                subtitle={view.details.subtitle}
                createdAt={view.details.createdAt}
                mediaMessages={mediaMessages}
                onOpenMembers={() => setModal({ type: "members" })}
                onOpenProfile={view.details.onOpenProfile}
                onRename={() => setModal({ type: "rename" })}
                canRename={view.details.canRename}
                onDelete={() => setModal({ type: "confirmDelete" })}
                canDelete={view.details.canDelete}
                onLeave={() => {}}
                canLeave={false}
                mediaAllowed={view.details.mediaAllowed}
                onToggleMedia={() =>
                  store.toggleChannelMedia(selectedChannel.id, currentUser.id)
                }
                canToggleMedia={view.details.canToggleMedia}
                canManageRoles={view.details.canManageRoles}
                onOpenRoles={() => setModal({ type: "roles" })}
              />
            )}
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            Select a conversation, or tap + to start a new one.
          </div>
        )}
      </div>

      {/* ---- Modals ---------------------------------------------------- */}

      {modal?.type === "startDm" && (
        <StartDmModal
          users={otherUsers}
          onClose={() => setModal(null)}
          onPick={async (userId) => {
            const result =
              await store.getOrCreateDm(
                currentUser.id,
                userId,
              );

            if (result.ok) {
              setSelectedDmId(
                result.data.id,
              );
            }
          }}
        />
      )}

      {modal?.type === "createGroup" && (
        <CreateGroupModal
          users={otherUsers}
          onClose={() => setModal(null)}
          onCreate={async ({ name, memberIds }) => {
            const result = await store.createGroup({
              name,
              memberIds,
            });

            if (result.ok) {
              setSelectedGroupId(result.data.id);
            }

            return result;
          }}
        />
      )}

      {modal?.type === "createChannel" && (
        <CreateChannelModal
          servers={store.listGroupsForUser()}
          onClose={() => setModal(null)}
          onCreate={async ({ name, serverId }) => {
            const result = await store.createChannel({
              name,
              serverId,
            });

            if (result.ok) {
              setSelectedChannelId(result.data.id);
            }

            return result;
          }}
        />
      )}

      {modal?.type === "members" && section === "group" && selectedGroup && (
        <MembersModal
          kind="group"
          entity={selectedGroup}
          getUser={store.getUser}
          currentUserId={currentUser.id}
          candidates={otherUsers}
          canManageMembers
          onAddMember={(userId) =>
            store.addMemberToGroup(selectedGroup.id, userId, currentUser.id)
          }
          onAssignRole={() => ({
            ok: false,
            error: "Groups do not have roles.",
          })}
          onOpenProfile={openProfile}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "members" &&
        section === "channel" &&
        selectedChannel && (
          <MembersModal
            kind="channel"
            entity={selectedChannel}
            getUser={store.getUser}
            currentUserId={currentUser.id}
            candidates={otherUsers}
            canManageMembers={channelPerms.manageMembers}
            onAddMember={(userId) =>
              store.addMemberToChannel(
                selectedChannel.id,
                userId,
                currentUser.id,
              )
            }
            onAssignRole={(userId, roleId) =>
              store.assignChannelRole(
                selectedChannel.id,
                userId,
                roleId,
                currentUser.id,
              )
            }
            onOpenProfile={openProfile}
            onClose={() => setModal(null)}
          />
        )}

      {modal?.type === "roles" && selectedChannel && (
        <RolesModal
          channel={selectedChannel}
          onClose={() => setModal(null)}
          onCreateRole={(name) =>
            store.createChannelRole(
              selectedChannel.id,
              name,
              {},
              currentUser.id,
            )
          }
          onUpdateRole={(roleId, patch) =>
            store.updateChannelRole(
              selectedChannel.id,
              roleId,
              patch,
              currentUser.id,
            )
          }
          onDeleteRole={(roleId) =>
            store.deleteChannelRole(selectedChannel.id, roleId, currentUser.id)
          }
        />
      )}

      {modal?.type === "rename" && section === "group" && selectedGroup && (
        <PromptModal
          title="Rename group"
          label="Group name"
          initialValue={selectedGroup.name}
          onClose={() => setModal(null)}
          onSubmit={(value) =>
            store.renameGroup(selectedGroup.id, value, currentUser.id)
          }
        />
      )}

      {modal?.type === "rename" && section === "channel" && selectedChannel && (
        <PromptModal
          title="Rename channel"
          label="Channel name"
          initialValue={selectedChannel.name}
          onClose={() => setModal(null)}
          onSubmit={(value) =>
            store.renameChannel(selectedChannel.id, value, currentUser.id)
          }
        />
      )}

      {modal?.type === "createTopic" && selectedChannel && (
        <PromptModal
          title="Create topic"
          label="Topic name"
          confirmLabel="Create topic"
          onClose={() => setModal(null)}
          onSubmit={async (value) => {
            const result = await store.createTopic(selectedChannel.id, value);

            if (result.ok) {
              setTopicByChannel((current) => ({
                ...current,

                [selectedChannel.id]: result.data.id,
              }));
            }

            return result;
          }}
        />
      )}

      {modal?.type === "confirmDeleteTopic" && selectedChannel && (
        <ConfirmDialog
          title="Delete topic"
          message="This topic and every message inside it will be permanently deleted for all members. This can't be undone."
          onClose={() => setModal(null)}
          onConfirm={() =>
            store.deleteTopic(selectedChannel.id, modal.topicId, currentUser.id)
          }
        />
      )}

      {modal?.type === "confirmDelete" &&
        section === "group" &&
        selectedGroup && (
          <ConfirmDialog
            title="Delete group"
            message={`"${selectedGroup.name}" and all of its messages will be permanently deleted for every member. This can't be undone.`}
            onClose={() => setModal(null)}
            onConfirm={() => {
              store.deleteGroup(selectedGroup.id, currentUser.id);
              setSelectedGroupId(null);
            }}
          />
        )}

      {modal?.type === "confirmDelete" &&
        section === "channel" &&
        selectedChannel && (
          <ConfirmDialog
            title="Delete channel"
            message={`"${selectedChannel.name}" and all of its topics and messages will be permanently deleted for every member. This can't be undone.`}
            onClose={() => setModal(null)}
            onConfirm={() => {
              store.deleteChannel(selectedChannel.id, currentUser.id);
              setSelectedChannelId(null);
            }}
          />
        )}

      {modal?.type === "confirmDeleteMessage" && (
        <ConfirmDialog
          title="Delete message"
          message="This message will be permanently deleted for everyone. This can't be undone."
          onClose={() => setModal(null)}
          onConfirm={() => store.deleteMessage(modal.messageId, currentUser.id)}
        />
      )}

      {modal?.type === "settings" && (
        <SettingsModal
          user={currentUser}
          simulateOffline={db.simulateOffline}
          onClose={() => setModal(null)}
          onUpdateProfile={(patch) =>
            store.updateProfile(currentUser.id, currentUser.id, patch)
          }
          onSetAllowAddToGroup={(allow) =>
            store.setAllowAddToGroup(currentUser.id, allow)
          }
          onSetSimulateOffline={(value) => store.setSimulateOffline(value)}
        />
      )}

      {modal?.type === "profile" && (
        <ProfileModal
          user={store.getUser(modal.userId)}
          isSelf={modal.userId === currentUser.id}
          onClose={() => setModal(null)}
          onEditRequest={openSettings}
        />
      )}

      {modal?.type === "notifications" && (
        <NotificationsPanel
          notifications={store.listNotifications(currentUser.id)}
          getUser={store.getUser}
          onClose={() => setModal(null)}
          onMarkAllRead={() => store.markAllNotificationsRead(currentUser.id)}
          onSelect={(n) => {
            store.markNotificationRead(n.id);
            setSection(n.scope);
            if (n.scope === "dm") setSelectedDmId(n.scopeId);
            if (n.scope === "group") setSelectedGroupId(n.scopeId);
            if (n.scope === "channel") {
              setSelectedChannelId(n.scopeId);
              setTopicByChannel((s) => ({ ...s, [n.scopeId]: n.topicId }));
            }
            setModal(null);
          }}
        />
      )}

      {modal?.type === "schedule" && view?.scheduleTarget && (
        <ScheduleMessageModal
          destinationLabel={view.title}
          onClose={() => setModal(null)}
          onSubmit={({ text, sendAt }) =>
            store.scheduleMessage({
              authorId: currentUser.id,
              scope: view.scheduleTarget.scope,
              scopeId: view.scheduleTarget.scopeId,
              topicId: view.scheduleTarget.topicId,
              kind: "text",
              text,
              sendAt,
            })
          }
        />
      )}

      {modal?.type === "scheduleEdit" && (
        <ScheduleMessageModal
          editing={modal.entry}
          destinationLabel={resolveScheduledDestination(modal.entry)}
          onClose={() => setModal(null)}
          onSubmit={({ text, sendAt }) =>
            store.editScheduledMessage(modal.entry.id, currentUser.id, {
              text,
              sendAt,
            })
          }
        />
      )}

      {modal?.type === "scheduled" && (
        <ScheduledMessagesModal
          entries={store.listScheduledForUser(currentUser.id)}
          resolveDestination={resolveScheduledDestination}
          onClose={() => setModal(null)}
          onEdit={(entry) => setModal({ type: "scheduleEdit", entry })}
          onCancel={(id) => store.cancelScheduledMessage(id, currentUser.id)}
        />
      )}
    </div>
  );
}
