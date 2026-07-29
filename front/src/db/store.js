import { makeId } from '../utils/id';

// ---------------------------------------------------------------------------
// This module simulates a backend + database entirely in the browser using
// localStorage, so the whole messenger works with zero server setup.
// Every exported function mirrors what a real API endpoint would do:
// it validates input, enforces permissions, mutates the "database" and
// returns a { ok, error, data } result. Swap this file for real HTTP/WS
// calls later without touching any component — the function signatures are
// designed to map 1:1 onto real endpoints.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'msgr_db_v1';
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB cap so localStorage never overflows
const NOTIFICATION_PREVIEW_LEN = 80;

// ---------------------------------------------------------------------------
// Channel role permission bits
// ---------------------------------------------------------------------------
const ALL_PERMS_TRUE = {
  post: true,
  deleteAnyMessage: true,
  manageMembers: true,
  manageTopics: true,
  manageChannel: true,
  manageRoles: true,
};
const ALL_PERMS_FALSE = {
  post: false,
  deleteAnyMessage: false,
  manageMembers: false,
  manageTopics: false,
  manageChannel: false,
  manageRoles: false,
};

function emptyDb() {
  return {
    currentUserId: null,
    simulateOffline: false,
    users: {},
    dms: {},
    groups: {},
    channels: {},
    messages: {},
    notifications: {},
    scheduledMessages: {},
    outbox: {},
  };
}

function makeChannelRoles() {
  const now = Date.now();
  const adminRole = { id: makeId('role'), name: 'Admin', permissions: { ...ALL_PERMS_TRUE }, isDefault: false, createdAt: now };
  const memberRole = { id: makeId('role'), name: 'Member', permissions: { ...ALL_PERMS_FALSE }, isDefault: true, createdAt: now };
  return { adminRole, memberRole };
}

function seed(db) {
  const mkUser = (username, name, email, bio) => ({
    id: makeId('u'),
    username,
    usernameLower: username.toLowerCase(),
    name,
    email,
    bio: bio || '',
    password: '123456',
    allowAddToGroup: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  });

  const sara = mkUser('sara_dev', 'Sara Ahmadi', 'sara@example.com', 'Frontend engineer. Coffee-powered.');
  const ali = mkUser('ali_designer', 'Ali Rezaei', 'ali@example.com', 'Product designer.');
  const reza = mkUser('reza_pm', 'Reza Karimi', 'reza@example.com', 'Product manager.');
  [sara, ali, reza].forEach((u) => {
    db.users[u.id] = u;
  });

  const channelId = makeId('ch');
  const topicGeneral = { id: makeId('tp'), name: 'General', createdAt: Date.now() };
  const topicAnnounce = { id: makeId('tp'), name: 'Announcements', createdAt: Date.now() };
  const { adminRole, memberRole } = makeChannelRoles(sara.id);
  db.channels[channelId] = {
    id: channelId,
    name: 'Main Channel',
    ownerId: sara.id,
    mediaAllowed: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    memberIds: [sara.id, ali.id, reza.id],
    topics: { [topicGeneral.id]: topicGeneral, [topicAnnounce.id]: topicAnnounce },
    roles: { [adminRole.id]: adminRole, [memberRole.id]: memberRole },
    memberRoles: { [ali.id]: adminRole.id, [reza.id]: memberRole.id },
    defaultRoleId: memberRole.id,
  };
  const msg1 = {
    id: makeId('m'),
    scope: 'channel',
    scopeId: channelId,
    topicId: topicGeneral.id,
    senderId: sara.id,
    kind: 'text',
    text: 'Welcome to the main channel! \ud83d\udc4b',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
  };
  db.messages[msg1.id] = msg1;

  const groupId = makeId('g');
  db.groups[groupId] = {
    id: groupId,
    name: 'Group chat',
    ownerId: sara.id,
    memberIds: [sara.id, ali.id, reza.id],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
  };
  const msg2 = {
    id: makeId('m'),
    scope: 'group',
    scopeId: groupId,
    senderId: ali.id,
    kind: 'text',
    text: 'Hey everyone!',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
  };
  db.messages[msg2.id] = msg2;

  return db;
}

function migrate(parsed) {
  // Merge with a fresh empty DB so older/newer shapes never crash the app.
  const base = emptyDb();
  const merged = { ...base, ...parsed };
  merged.users = parsed.users || {};
  merged.dms = parsed.dms || {};
  merged.groups = parsed.groups || {};
  merged.channels = parsed.channels || {};
  merged.messages = parsed.messages || {};
  merged.notifications = parsed.notifications || {};
  merged.scheduledMessages = parsed.scheduledMessages || {};
  merged.outbox = parsed.outbox || {};
  merged.simulateOffline = !!parsed.simulateOffline;

  // Backfill any user missing the newer `bio` field.
  Object.values(merged.users).forEach((u) => {
    if (u.bio === undefined) u.bio = '';
  });

  // Backfill channels created under the old adminIds model into the roles model.
  Object.values(merged.channels).forEach((c) => {
    if (!c.roles) {
      const { adminRole, memberRole } = makeChannelRoles(c.ownerId);
      const memberRoles = {};
      (c.memberIds || []).forEach((uid) => {
        if (uid === c.ownerId) return;
        memberRoles[uid] = (c.adminIds || []).includes(uid) ? adminRole.id : memberRole.id;
      });
      c.roles = { [adminRole.id]: adminRole, [memberRole.id]: memberRole };
      c.memberRoles = memberRoles;
      c.defaultRoleId = memberRole.id;
      delete c.adminIds;
    }
  });

  return merged;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed(emptyDb());
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return seed(emptyDb());
  }
}

let db = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Persist failed', e);
  }
  listeners.forEach((cb) => cb());
}

function mutate(fn) {
  db = { ...db };
  fn(db);
  persist();
}

// Like mutate, but doesn't persist to localStorage — used for purely
// transient UI state (e.g. reacting to a browser online/offline event).
function touch(fn) {
  db = { ...db };
  if (fn) fn(db);
  listeners.forEach((cb) => cb());
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      db = load();
      listeners.forEach((cb) => cb());
    }
  });
  window.addEventListener('online', () => {
    touch();
    flushOutbox();
  });
  window.addEventListener('offline', () => {
    touch();
  });
}

export function getSnapshot() {
  return db;
}

// ---------------------------------------------------------------------------
// Connection simulation (for testing "offline" behaviour without a real
// backend or network toggle)
// ---------------------------------------------------------------------------

export function isOffline() {
  const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return db.simulateOffline || browserOffline;
}

export function setSimulateOffline(value) {
  mutate((d) => {
    d.simulateOffline = value;
  });
  if (!value) flushOutbox();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function register({ name, email, username, password }) {
  name = (name || '').trim();
  email = (email || '').trim();
  username = (username || '').trim();

  if (!name || !email || !username || !password) {
    return { ok: false, error: 'All fields are required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { ok: false, error: 'Username must be 3-20 characters (letters, numbers, or _).' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const usernameLower = username.toLowerCase();
  const emailLower = email.toLowerCase();
  const exists = Object.values(db.users).some(
    (u) => u.usernameLower === usernameLower || u.email.toLowerCase() === emailLower
  );
  if (exists) {
    return { ok: false, error: 'This username or email is already registered.' };
  }

  const user = {
    id: makeId('u'),
    username,
    usernameLower,
    name,
    email,
    bio: '',
    password,
    allowAddToGroup: true,
    createdAt: Date.now(),
  };

  mutate((d) => {
    d.users = { ...d.users, [user.id]: user };
    d.currentUserId = user.id;
  });

  return { ok: true, data: user };
}

export function login({ username, password }) {
  username = (username || '').trim();
  if (!username || !password) {
    return { ok: false, error: 'Enter your username and password.' };
  }
  const usernameLower = username.toLowerCase();
  const user = Object.values(db.users).find((u) => u.usernameLower === usernameLower);
  if (!user || user.password !== password) {
    return { ok: false, error: 'Incorrect username or password.' };
  }
  mutate((d) => {
    d.currentUserId = user.id;
  });
  return { ok: true, data: user };
}

export function logout() {
  mutate((d) => {
    d.currentUserId = null;
  });
}

export function getCurrentUser() {
  return db.currentUserId ? db.users[db.currentUserId] : null;
}

// ---------------------------------------------------------------------------
// Users / profiles
// ---------------------------------------------------------------------------

export function listOtherUsers(excludeId) {
  return Object.values(db.users)
    .filter((u) => u.id !== excludeId)
    .sort((a, b) => a.username.localeCompare(b.username));
}

export function getUser(id) {
  return db.users[id] || null;
}

export function setAllowAddToGroup(userId, allow) {
  mutate((d) => {
    if (d.users[userId]) d.users[userId] = { ...d.users[userId], allowAddToGroup: allow };
  });
  return { ok: true };
}

// Edits every profile field except username, and only for your own account.
export function updateProfile(userId, actorId, { name, email, bio }) {
  if (userId !== actorId) {
    return { ok: false, error: 'You can only edit your own profile.' };
  }
  const user = db.users[userId];
  if (!user) return { ok: false, error: 'User not found.' };

  name = name !== undefined ? name.trim() : user.name;
  email = email !== undefined ? email.trim() : user.email;
  bio = bio !== undefined ? bio : user.bio;

  if (!name) return { ok: false, error: 'Name cannot be empty.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  const emailTaken = Object.values(db.users).some(
    (u) => u.id !== userId && u.email.toLowerCase() === email.toLowerCase()
  );
  if (emailTaken) return { ok: false, error: 'That email is already in use by another account.' };
  if (bio && bio.length > 240) return { ok: false, error: 'Bio must be 240 characters or fewer.' };

  mutate((d) => {
    d.users[userId] = { ...d.users[userId], name, email, bio };
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

export function getOrCreateDm(userA, userB) {
  const existing = Object.values(db.dms).find(
    (c) => c.memberIds.includes(userA) && c.memberIds.includes(userB)
  );
  if (existing) return existing;
  const dm = { id: makeId('dm'), memberIds: [userA, userB], createdAt: Date.now() };
  mutate((d) => {
    d.dms = { ...d.dms, [dm.id]: dm };
  });
  return dm;
}

export function listDmsForUser(userId) {
  return Object.values(db.dms).filter((c) => c.memberIds.includes(userId));
}

export function getDm(id) {
  return db.dms[id] || null;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export function createGroup({ name, creatorId, memberIds }) {
  name = (name || '').trim();
  if (!name) return { ok: false, error: 'Group name is required.' };
  const uniqueMembers = Array.from(new Set(memberIds));
  if (uniqueMembers.length < 1) {
    return { ok: false, error: 'Select at least one other member.' };
  }
  const blocked = uniqueMembers
    .map((id) => db.users[id])
    .filter((u) => u && u.allowAddToGroup === false);
  if (blocked.length > 0) {
    return {
      ok: false,
      error: `Can't add ${blocked.map((u) => '@' + u.username).join(', ')} \u2014 this user has turned off being added to groups.`,
    };
  }

  const group = {
    id: makeId('g'),
    name,
    ownerId: creatorId,
    memberIds: Array.from(new Set([creatorId, ...uniqueMembers])),
    createdAt: Date.now(),
  };
  mutate((d) => {
    d.groups = { ...d.groups, [group.id]: group };
  });
  return { ok: true, data: group };
}

export function listGroupsForUser(userId) {
  return Object.values(db.groups).filter((g) => g.memberIds.includes(userId));
}

export function getGroup(id) {
  return db.groups[id] || null;
}

export function renameGroup(groupId, newName, actorId) {
  const group = db.groups[groupId];
  if (!group) return { ok: false, error: 'Group not found.' };
  if (!group.memberIds.includes(actorId)) {
    return { ok: false, error: 'You are not a member of this group.' };
  }
  newName = (newName || '').trim();
  if (!newName) return { ok: false, error: 'Group name cannot be empty.' };
  mutate((d) => {
    d.groups[groupId] = { ...d.groups[groupId], name: newName };
  });
  return { ok: true };
}

export function deleteGroup(groupId, actorId) {
  const group = db.groups[groupId];
  if (!group) return { ok: false, error: 'Group not found.' };
  if (!group.memberIds.includes(actorId)) {
    return { ok: false, error: 'You are not a member of this group.' };
  }
  mutate((d) => {
    const { [groupId]: _removed, ...rest } = d.groups;
    d.groups = rest;
    const nextMessages = { ...d.messages };
    Object.values(nextMessages).forEach((m) => {
      if (m.scope === 'group' && m.scopeId === groupId) delete nextMessages[m.id];
    });
    d.messages = nextMessages;
  });
  return { ok: true };
}

export function addMemberToGroup(groupId, userId, actorId) {
  const group = db.groups[groupId];
  if (!group) return { ok: false, error: 'Group not found.' };
  if (!group.memberIds.includes(actorId)) {
    return { ok: false, error: 'You are not a member of this group.' };
  }
  const target = db.users[userId];
  if (!target) return { ok: false, error: 'User not found.' };
  if (group.memberIds.includes(userId)) {
    return { ok: false, error: 'This user is already a member of the group.' };
  }
  if (target.allowAddToGroup === false) {
    return { ok: false, error: `@${target.username} has turned off being added to groups.` };
  }
  mutate((d) => {
    d.groups[groupId] = { ...d.groups[groupId], memberIds: [...d.groups[groupId].memberIds, userId] };
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Channels — membership, topics
// ---------------------------------------------------------------------------

export function createChannel({ name, ownerId }) {
  name = (name || '').trim();
  if (!name) return { ok: false, error: 'Channel name is required.' };
  const topic = { id: makeId('tp'), name: 'General', createdAt: Date.now() };
  const { adminRole, memberRole } = makeChannelRoles(ownerId);
  const channel = {
    id: makeId('ch'),
    name,
    ownerId,
    mediaAllowed: true,
    createdAt: Date.now(),
    memberIds: [ownerId],
    topics: { [topic.id]: topic },
    roles: { [adminRole.id]: adminRole, [memberRole.id]: memberRole },
    memberRoles: {},
    defaultRoleId: memberRole.id,
  };
  mutate((d) => {
    d.channels = { ...d.channels, [channel.id]: channel };
  });
  return { ok: true, data: channel };
}

export function listChannelsForUser(userId) {
  return Object.values(db.channels).filter((c) => c.memberIds.includes(userId));
}

export function getChannel(id) {
  return db.channels[id] || null;
}

// ---- Roles & permissions ---------------------------------------------------

const OWNER_ROLE = Object.freeze({ id: 'owner', name: 'Owner', permissions: Object.freeze({ ...ALL_PERMS_TRUE }) });

export function getChannelRole(channel, userId) {
  if (!channel) return null;
  if (channel.ownerId === userId) return OWNER_ROLE;
  const roleId = channel.memberRoles[userId];
  return roleId ? channel.roles[roleId] : null;
}

export function channelHasPermission(channel, userId, permKey) {
  const role = getChannelRole(channel, userId);
  return !!(role && role.permissions[permKey]);
}

export function getChannelPermissions(channel, userId) {
  const role = getChannelRole(channel, userId);
  return role ? { ...role.permissions } : { ...ALL_PERMS_FALSE };
}

export function listChannelRoles(channel) {
  return [OWNER_ROLE, ...Object.values(channel.roles)];
}

function requirePermission(channel, actorId, permKey, message) {
  if (!channelHasPermission(channel, actorId, permKey)) {
    return { ok: false, error: message };
  }
  return { ok: true };
}

export function renameChannel(channelId, newName, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageChannel', "You don't have permission to manage this channel.");
  if (!perm.ok) return perm;
  newName = (newName || '').trim();
  if (!newName) return { ok: false, error: 'Channel name cannot be empty.' };
  mutate((d) => {
    d.channels[channelId] = { ...d.channels[channelId], name: newName };
  });
  return { ok: true };
}

export function deleteChannel(channelId, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageChannel', "You don't have permission to manage this channel.");
  if (!perm.ok) return perm;
  mutate((d) => {
    const { [channelId]: _removed, ...rest } = d.channels;
    d.channels = rest;
    const nextMessages = { ...d.messages };
    Object.values(nextMessages).forEach((m) => {
      if (m.scope === 'channel' && m.scopeId === channelId) delete nextMessages[m.id];
    });
    d.messages = nextMessages;
  });
  return { ok: true };
}

export function addMemberToChannel(channelId, userId, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageMembers', "You don't have permission to add members.");
  if (!perm.ok) return perm;
  if (channel.memberIds.includes(userId)) {
    return { ok: false, error: 'This user is already a member of the channel.' };
  }
  mutate((d) => {
    const ch = d.channels[channelId];
    d.channels[channelId] = {
      ...ch,
      memberIds: [...ch.memberIds, userId],
      memberRoles: { ...ch.memberRoles, [userId]: ch.defaultRoleId },
    };
  });
  return { ok: true };
}

export function assignChannelRole(channelId, targetUserId, roleId, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  if (targetUserId === channel.ownerId) {
    return { ok: false, error: "The channel owner's role can't be changed." };
  }
  if (!channel.memberIds.includes(targetUserId)) {
    return { ok: false, error: 'This user is not a member of the channel.' };
  }
  const perm = requirePermission(channel, actorId, 'manageMembers', "You don't have permission to change member roles.");
  if (!perm.ok) return perm;
  if (!channel.roles[roleId]) {
    return { ok: false, error: 'Role not found.' };
  }
  mutate((d) => {
    d.channels[channelId] = {
      ...d.channels[channelId],
      memberRoles: { ...d.channels[channelId].memberRoles, [targetUserId]: roleId },
    };
  });
  return { ok: true };
}

export function createChannelRole(channelId, name, permissions, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageRoles', "You don't have permission to manage roles.");
  if (!perm.ok) return perm;
  name = (name || '').trim();
  if (!name) return { ok: false, error: 'Role name is required.' };
  const role = { id: makeId('role'), name, permissions: { ...ALL_PERMS_FALSE, ...permissions }, isDefault: false, createdAt: Date.now() };
  mutate((d) => {
    d.channels[channelId] = {
      ...d.channels[channelId],
      roles: { ...d.channels[channelId].roles, [role.id]: role },
    };
  });
  return { ok: true, data: role };
}

export function updateChannelRole(channelId, roleId, patch, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageRoles', "You don't have permission to manage roles.");
  if (!perm.ok) return perm;
  const role = channel.roles[roleId];
  if (!role) return { ok: false, error: 'Role not found.' };
  const nextName = patch.name !== undefined ? patch.name.trim() : role.name;
  if (!nextName) return { ok: false, error: 'Role name cannot be empty.' };
  const nextPermissions = patch.permissions ? { ...role.permissions, ...patch.permissions } : role.permissions;
  mutate((d) => {
    d.channels[channelId] = {
      ...d.channels[channelId],
      roles: {
        ...d.channels[channelId].roles,
        [roleId]: { ...role, name: nextName, permissions: nextPermissions },
      },
    };
  });
  return { ok: true };
}

export function deleteChannelRole(channelId, roleId, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageRoles', "You don't have permission to manage roles.");
  if (!perm.ok) return perm;
  if (roleId === channel.defaultRoleId) {
    return { ok: false, error: "The default role can't be deleted." };
  }
  if (!channel.roles[roleId]) return { ok: false, error: 'Role not found.' };
  mutate((d) => {
    const ch = d.channels[channelId];
    const { [roleId]: _removed, ...restRoles } = ch.roles;
    const nextMemberRoles = { ...ch.memberRoles };
    Object.keys(nextMemberRoles).forEach((uid) => {
      if (nextMemberRoles[uid] === roleId) nextMemberRoles[uid] = ch.defaultRoleId;
    });
    d.channels[channelId] = { ...ch, roles: restRoles, memberRoles: nextMemberRoles };
  });
  return { ok: true };
}

export function createTopic(channelId, name, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageTopics', "You don't have permission to create topics.");
  if (!perm.ok) return perm;
  name = (name || '').trim();
  if (!name) return { ok: false, error: 'Topic name is required.' };
  const topic = { id: makeId('tp'), name, createdAt: Date.now() };
  mutate((d) => {
    d.channels[channelId] = {
      ...d.channels[channelId],
      topics: { ...d.channels[channelId].topics, [topic.id]: topic },
    };
  });
  return { ok: true, data: topic };
}

export function deleteTopic(channelId, topicId, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageTopics', "You don't have permission to delete topics.");
  if (!perm.ok) return perm;
  mutate((d) => {
    const { [topicId]: _removed, ...restTopics } = d.channels[channelId].topics;
    d.channels[channelId] = { ...d.channels[channelId], topics: restTopics };
    const nextMessages = { ...d.messages };
    Object.values(nextMessages).forEach((m) => {
      if (m.scope === 'channel' && m.scopeId === channelId && m.topicId === topicId) {
        delete nextMessages[m.id];
      }
    });
    d.messages = nextMessages;
  });
  return { ok: true };
}

export function toggleChannelMedia(channelId, actorId) {
  const channel = db.channels[channelId];
  if (!channel) return { ok: false, error: 'Channel not found.' };
  const perm = requirePermission(channel, actorId, 'manageChannel', "You don't have permission to manage this channel.");
  if (!perm.ok) return perm;
  mutate((d) => {
    d.channels[channelId] = { ...d.channels[channelId], mediaAllowed: !d.channels[channelId].mediaAllowed };
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

function getConversationRecipients(scope, scopeId, senderId) {
  if (scope === 'dm') {
    const dm = db.dms[scopeId];
    return dm ? dm.memberIds.filter((id) => id !== senderId) : [];
  }
  if (scope === 'group') {
    const group = db.groups[scopeId];
    return group ? group.memberIds.filter((id) => id !== senderId) : [];
  }
  if (scope === 'channel') {
    const channel = db.channels[scopeId];
    return channel ? channel.memberIds.filter((id) => id !== senderId) : [];
  }
  return [];
}

function validateMessagePayload({ kind, text, fileSize }) {
  if (kind === 'text') {
    if (!text || !text.trim()) return { ok: false, error: 'Message text cannot be empty.' };
  } else if (fileSize && fileSize > MAX_FILE_BYTES) {
    return { ok: false, error: 'File is larger than the 4MB demo limit.' };
  }
  return { ok: true };
}

function checkSendPermission({ scope, scopeId, topicId, senderId, kind }) {
  if (scope === 'dm') {
    const dm = db.dms[scopeId];
    if (!dm || !dm.memberIds.includes(senderId)) {
      return { ok: false, error: "You don't have access to this conversation." };
    }
  } else if (scope === 'group') {
    const group = db.groups[scopeId];
    if (!group || !group.memberIds.includes(senderId)) {
      return { ok: false, error: 'You are not a member of this group.' };
    }
  } else if (scope === 'channel') {
    const channel = db.channels[scopeId];
    if (!channel || !channel.memberIds.includes(senderId)) {
      return { ok: false, error: 'You are not a member of this channel.' };
    }
    if (!channelHasPermission(channel, senderId, 'post')) {
      return { ok: false, error: "Your role doesn't allow posting in this channel." };
    }
    if (!channel.topics[topicId]) {
      return { ok: false, error: 'Select a topic first.' };
    }
    if (kind !== 'text' && channel.mediaAllowed === false && senderId !== channel.ownerId) {
      return { ok: false, error: 'Media sharing is disabled in this channel by the admin.' };
    }
  } else {
    return { ok: false, error: 'Invalid message destination.' };
  }
  return { ok: true };
}

function createNotificationsFor(scope, scopeId, topicId, senderId, message) {
  const recipients = getConversationRecipients(scope, scopeId, senderId);
  const preview =
    message.kind === 'text'
      ? message.text.slice(0, NOTIFICATION_PREVIEW_LEN)
      : `Sent ${message.kind === 'file' ? 'a file' : `a ${message.kind}`}${message.text ? `: ${message.text.slice(0, 50)}` : ''}`;
  recipients.forEach((userId) => {
    const notif = {
      id: makeId('n'),
      userId,
      fromUserId: senderId,
      scope,
      scopeId,
      topicId,
      preview,
      createdAt: message.createdAt,
      read: false,
    };
    db.notifications[notif.id] = notif;
  });
}

function buildMessageRecord({ scope, scopeId, topicId, senderId, kind, text, fileName, fileSize, dataUrl, createdAt }) {
  return {
    id: makeId('m'),
    scope,
    scopeId,
    topicId: scope === 'channel' ? topicId : undefined,
    senderId,
    kind,
    text: text ? text.trim() : '',
    fileName: fileName || undefined,
    fileSize: fileSize || undefined,
    dataUrl: dataUrl || undefined,
    createdAt: createdAt || Date.now(),
  };
}

export function listMessages(scope, scopeId, topicId) {
  return Object.values(db.messages)
    .filter((m) => {
      if (m.scope !== scope || m.scopeId !== scopeId) return false;
      if (scope === 'channel' && m.topicId !== topicId) return false;
      return true;
    })
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function searchConversationMessages(scope, scopeId, topicId, query) {
  const q = (query || '').trim().toLowerCase();
  const all = listMessages(scope, scopeId, topicId);
  if (!q) return all;
  return all.filter((m) => {
    const inText = m.text && m.text.toLowerCase().includes(q);
    const inFile = m.fileName && m.fileName.toLowerCase().includes(q);
    return inText || inFile;
  });
}

export function sendMessage(payload) {
  const { scope, scopeId, topicId, senderId } = payload;
  const validation = validateMessagePayload(payload);
  if (!validation.ok) return validation;
  const permission = checkSendPermission(payload);
  if (!permission.ok) return permission;

  const message = buildMessageRecord(payload);
  mutate((d) => {
    d.messages = { ...d.messages, [message.id]: message };
    createNotificationsFor(scope, scopeId, topicId, senderId, message);
  });
  return { ok: true, data: message };
}

export function editMessage(messageId, actorId, { text }) {
  const message = db.messages[messageId];
  if (!message) return { ok: false, error: 'Message not found.' };
  if (message.senderId !== actorId) {
    return { ok: false, error: 'You can only edit your own messages.' };
  }
  if (message.kind === 'text' && (!text || !text.trim())) {
    return { ok: false, error: 'Message cannot be empty.' };
  }
  mutate((d) => {
    d.messages[messageId] = {
      ...d.messages[messageId],
      text: text !== undefined ? text.trim() : d.messages[messageId].text,
      editedAt: Date.now(),
    };
  });
  return { ok: true };
}

function canDeleteAnyMessageIn(scope, scopeId, actorId) {
  if (scope === 'group') {
    const group = db.groups[scopeId];
    return group && group.ownerId === actorId;
  }
  if (scope === 'channel') {
    const channel = db.channels[scopeId];
    return channel && channelHasPermission(channel, actorId, 'deleteAnyMessage');
  }
  return false;
}

export function deleteMessage(messageId, actorId) {
  const message = db.messages[messageId];
  if (!message) return { ok: false, error: 'Message not found.' };
  const isOwn = message.senderId === actorId;
  const isManager = canDeleteAnyMessageIn(message.scope, message.scopeId, actorId);
  if (!isOwn && !isManager) {
    return { ok: false, error: "You don't have permission to delete this message." };
  }
  mutate((d) => {
    const { [messageId]: _removed, ...rest } = d.messages;
    d.messages = rest;
  });
  return { ok: true };
}

export function canManageMessagesIn(scope, scopeId, actorId) {
  return canDeleteAnyMessageIn(scope, scopeId, actorId);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function listNotifications(userId) {
  return Object.values(db.notifications)
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function unreadNotificationCount(userId) {
  return Object.values(db.notifications).filter((n) => n.userId === userId && !n.read).length;
}

export function markNotificationRead(id) {
  mutate((d) => {
    if (d.notifications[id]) d.notifications[id] = { ...d.notifications[id], read: true };
  });
  return { ok: true };
}

export function markAllNotificationsRead(userId) {
  mutate((d) => {
    const next = { ...d.notifications };
    Object.values(next).forEach((n) => {
      if (n.userId === userId && !n.read) next[n.id] = { ...n, read: true };
    });
    d.notifications = next;
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Scheduled messages (award #2)
// ---------------------------------------------------------------------------

export function scheduleMessage(payload) {
  const { authorId, scope, scopeId, topicId, sendAt } = payload;
  const validation = validateMessagePayload(payload);
  if (!validation.ok) return validation;
  if (!sendAt || sendAt <= Date.now()) {
    return { ok: false, error: 'Pick a date and time in the future.' };
  }
  const permission = checkSendPermission({ ...payload, senderId: authorId });
  if (!permission.ok) return permission;

  const entry = {
    id: makeId('sched'),
    authorId,
    scope,
    scopeId,
    topicId: scope === 'channel' ? topicId : undefined,
    kind: payload.kind,
    text: payload.text ? payload.text.trim() : '',
    fileName: payload.fileName || undefined,
    fileSize: payload.fileSize || undefined,
    dataUrl: payload.dataUrl || undefined,
    sendAt,
    status: 'pending',
    createdAt: Date.now(),
  };
  mutate((d) => {
    d.scheduledMessages = { ...d.scheduledMessages, [entry.id]: entry };
  });
  return { ok: true, data: entry };
}

export function editScheduledMessage(id, actorId, patch) {
  const entry = db.scheduledMessages[id];
  if (!entry) return { ok: false, error: 'Scheduled message not found.' };
  if (entry.authorId !== actorId) return { ok: false, error: 'You can only edit your own scheduled messages.' };
  if (entry.status !== 'pending') return { ok: false, error: 'This message can no longer be edited.' };
  if (patch.sendAt !== undefined && patch.sendAt <= Date.now()) {
    return { ok: false, error: 'Pick a date and time in the future.' };
  }
  if (patch.text !== undefined && entry.kind === 'text' && !patch.text.trim()) {
    return { ok: false, error: 'Message text cannot be empty.' };
  }
  mutate((d) => {
    d.scheduledMessages[id] = {
      ...d.scheduledMessages[id],
      text: patch.text !== undefined ? patch.text.trim() : d.scheduledMessages[id].text,
      sendAt: patch.sendAt !== undefined ? patch.sendAt : d.scheduledMessages[id].sendAt,
    };
  });
  return { ok: true };
}

export function cancelScheduledMessage(id, actorId) {
  const entry = db.scheduledMessages[id];
  if (!entry) return { ok: false, error: 'Scheduled message not found.' };
  if (entry.authorId !== actorId) return { ok: false, error: 'You can only cancel your own scheduled messages.' };
  if (entry.status !== 'pending') return { ok: false, error: 'This message can no longer be canceled.' };
  mutate((d) => {
    d.scheduledMessages[id] = { ...d.scheduledMessages[id], status: 'canceled' };
  });
  return { ok: true };
}

export function listScheduledForUser(authorId) {
  return Object.values(db.scheduledMessages)
    .filter((s) => s.authorId === authorId)
    .sort((a, b) => a.sendAt - b.sendAt);
}

// Call periodically (e.g. from a UI timer) to actually deliver any due
// scheduled messages. A real backend would do this with a queue/cron job.
export function processDueScheduledMessages() {
  const now = Date.now();
  const due = Object.values(db.scheduledMessages).filter((s) => s.status === 'pending' && s.sendAt <= now);
  if (due.length === 0) return;

  mutate((d) => {
    due.forEach((entry) => {
      const permission = checkSendPermission({ ...entry, senderId: entry.authorId });
      const validation = validateMessagePayload(entry);
      if (!permission.ok || !validation.ok) {
        d.scheduledMessages[entry.id] = {
          ...d.scheduledMessages[entry.id],
          status: 'failed',
          error: !validation.ok ? validation.error : permission.error,
        };
        return;
      }
      const message = buildMessageRecord({ ...entry, senderId: entry.authorId, createdAt: Date.now() });
      d.messages = { ...d.messages, [message.id]: message };
      createNotificationsFor(entry.scope, entry.scopeId, entry.topicId, entry.authorId, message);
      d.scheduledMessages[entry.id] = { ...d.scheduledMessages[entry.id], status: 'sent', sentAt: message.createdAt };
    });
  });
}

// ---------------------------------------------------------------------------
// Offline outbox (award #1, item 3) — messages composed while offline are
// queued locally and flushed automatically once back online.
// ---------------------------------------------------------------------------

export function sendOrQueueMessage(payload) {
  if (!isOffline()) {
    return sendMessage(payload);
  }
  const entry = {
    id: makeId('out'),
    payload,
    status: 'queued',
    createdAt: Date.now(),
  };
  mutate((d) => {
    d.outbox = { ...d.outbox, [entry.id]: entry };
  });
  return { ok: true, queued: true, data: entry };
}

export function listOutboxForConversation(scope, scopeId, topicId) {
  return Object.values(db.outbox)
    .filter((o) => o.payload.scope === scope && o.payload.scopeId === scopeId && o.payload.topicId === topicId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function retryOutboxItem(id) {
  const entry = db.outbox[id];
  if (!entry) return { ok: false, error: 'Queued message not found.' };
  const result = sendMessage(entry.payload);
  mutate((d) => {
    if (result.ok) {
      const { [id]: _removed, ...rest } = d.outbox;
      d.outbox = rest;
    } else {
      d.outbox[id] = { ...d.outbox[id], status: 'failed', error: result.error };
    }
  });
  return result;
}

export function removeOutboxItem(id) {
  mutate((d) => {
    const { [id]: _removed, ...rest } = d.outbox;
    d.outbox = rest;
  });
  return { ok: true };
}

export function flushOutbox() {
  if (isOffline()) return;
  const queued = Object.values(db.outbox)
    .filter((o) => o.status === 'queued')
    .sort((a, b) => a.createdAt - b.createdAt);
  queued.forEach((entry) => retryOutboxItem(entry.id));
}

export const MAX_FILE_BYTES_EXPORT = MAX_FILE_BYTES;
