const ACCESS_TOKEN_KEY = 'discord_access_token';
const REFRESH_TOKEN_KEY = 'discord_refresh_token';

export const MAX_FILE_BYTES_EXPORT = 4 * 1024 * 1024;

// -----------------------------------------------------------------------------
// Frontend state only.
// All domain data in these objects comes from backend responses.
// -----------------------------------------------------------------------------

let state = {
  initialized: false,

  currentUserId: null,

  users: {},
  dms: {},
  groups: {},
  channels: {},
  messages: {},

  // Kept only because some existing UI code reads it.
  // We are NOT implementing fake offline mode anymore.
  simulateOffline: false,
};

const listeners = new Set();

// -----------------------------------------------------------------------------
// React store helpers
// -----------------------------------------------------------------------------

function emit() {
  listeners.forEach((listener) => listener());
}

function updateState(updater) {
  const next = updater(state);
  state = next || state;
  emit();
}

export function subscribe(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot() {
  return state;
}

// -----------------------------------------------------------------------------
// Token helpers
// -----------------------------------------------------------------------------

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function saveTokens(tokens) {
  if (tokens?.accessToken) {
    localStorage.setItem(
      ACCESS_TOKEN_KEY,
      tokens.accessToken,
    );
  }

  if (tokens?.refreshToken) {
    localStorage.setItem(
      REFRESH_TOKEN_KEY,
      tokens.refreshToken,
    );
  }
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// -----------------------------------------------------------------------------
// API helper
// -----------------------------------------------------------------------------

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get('content-type') || '';

  if (
    contentType.includes(
      'application/json',
    )
  ) {
    return response.json();
  }

  return response.text();
}

function getErrorMessage(
  data,
  response,
) {
  if (
    typeof data === 'string' &&
    data.trim()
  ) {
    return data;
  }

  if (data?.message) {
    return data.message;
  }

  if (data?.error) {
    return data.error;
  }

  return `${response.status} ${response.statusText}`;
}

async function refreshAccessToken() {
  const refreshToken =
    getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  const response = await fetch(
    '/api/v1/users/refresh',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        refreshToken,
      }),
    },
  );

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const tokens =
    await parseResponse(
      response,
    );

  saveTokens(tokens);

  return true;
}

async function api(
  path,
  {
    method = 'GET',
    body,
    formData,
    auth = true,
    retry = true,
  } = {},
) {
  const headers = {};

  if (auth) {
    const token =
      getAccessToken();

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }
  }

  if (
    body !== undefined
  ) {
    headers['Content-Type'] =
      'application/json';
  }

  console.log(
    `[API] ${method} ${path}`,
    body ?? '',
  );

  const response =
    await fetch(path, {
      method,
      headers,

      body:
        formData ||
        (
          body !== undefined
            ? JSON.stringify(body)
            : undefined
        ),
    });

  if (
    response.status === 401 &&
    auth &&
    retry &&
    path !==
      '/api/v1/users/refresh'
  ) {
    const refreshed =
      await refreshAccessToken();

    if (refreshed) {
      return api(path, {
        method,
        body,
        formData,
        auth,
        retry: false,
      });
    }
  }

  const data =
    await parseResponse(
      response,
    );

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        response,
      ),
    );
  }

  return data;
}

// -----------------------------------------------------------------------------
// Standard return objects used by your existing UI
// -----------------------------------------------------------------------------

function ok(data = null) {
  return {
    ok: true,
    data,
  };
}

function fail(error) {
  return {
    ok: false,

    error:
      error instanceof Error
        ? error.message
        : String(error),
  };
}

// -----------------------------------------------------------------------------
// User normalization
// -----------------------------------------------------------------------------

function splitName(name) {
  const parts =
    String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  return {
    firstName:
      parts[0] || '',

    // Backend requires lastName.
    lastName:
      parts
        .slice(1)
        .join(' ') ||
      parts[0] ||
      '',
  };
}

function userFromApi(profile) {
  if (!profile?.username) {
    return null;
  }

  const existing =
    state.users[
      profile.username
    ] || {};

  const name = [
    profile.firstName,
    profile.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    ...existing,

    // Use username as frontend identity because
    // several backend DTOs don't contain UUID.
    id:
      profile.username,

    backendId:
      profile.id ??
      existing.backendId ??
      null,

    username:
      profile.username,

    name:
      name ||
      existing.name ||
      profile.username,

    email:
      profile.email ??
      existing.email ??
      '',

    bio:
      profile.bio ??
      existing.bio ??
      '',

    avatarUrls:
      profile.avatarUrls ??
      existing.avatarUrls ??
      [],

    allowAddToGroup:
      profile.allowGroupAdditions ??
      existing.allowAddToGroup ??
      true,
  };
}

function userReference(username) {
  /*
   * This isn't fake backend data.
   *
   * The username came from ServerMember.
   * This is only a temporary frontend representation
   * until /users/{username} is fetched.
   */
  return {
    id: username,
    username,
    name: username,
    email: '',
    bio: '',
    avatarUrls: [],
    allowAddToGroup: true,
  };
}

function cacheUser(profile) {
  const user =
    userFromApi(profile);

  if (!user) {
    return null;
  }

  updateState((s) => ({
    ...s,

    users: {
      ...s.users,

      [user.id]:
        user,
    },
  }));

  return user;
}

function ensureUserReference(
  username,
) {
  if (
    !username ||
    state.users[
      username
    ]
  ) {
    return;
  }

  updateState((s) => ({
    ...s,

    users: {
      ...s.users,

      [username]:
        userReference(
          username,
        ),
    },
  }));
}

async function loadUserProfile(
  username,
) {
  if (!username) {
    return null;
  }

  try {
    const profile =
      await api(
        `/api/v1/users/${encodeURIComponent(
          username,
        )}`,
      );

    return cacheUser(
      profile,
    );
  } catch {
    // Username still came from backend server/member response.
    ensureUserReference(
      username,
    );

    return (
      state.users[
        username
      ] || null
    );
  }
}

// -----------------------------------------------------------------------------
// Role / permission normalization
// -----------------------------------------------------------------------------

function parsePermissions(role) {
  try {
    return JSON.parse(
      role?.permissionsJson ||
      '[]',
    );
  } catch {
    return [];
  }
}

function frontendPermissions(
  role,
) {
  const permissions =
    parsePermissions(role);

  const all =
    permissions.includes('*');

  const has =
    (permission) =>
      all ||
      permissions.includes(
        permission,
      );

  return {
    post:
      has('SEND_TEXT'),

    deleteAnyMessage:
      has(
        'DELETE_ANY_MESSAGE',
      ),

    manageMembers:
      has('BAN_MEMBERS'),

    manageTopics:
      has('MANAGE_TOPICS'),

    manageChannel:
      has(
        'MANAGE_CHANNELS',
      ),

    manageRoles:
      has('MANAGE_ROLES'),
  };
}

function normalizeRole(role) {
  return {
    id: role.id,
    name: role.name,

    permissions:
      frontendPermissions(
        role,
      ),
  };
}

// -----------------------------------------------------------------------------
// Topic normalization
// -----------------------------------------------------------------------------

function normalizeTopic(topic) {
  return {
    id: topic.id,
    name: topic.name,

    createdAt:
      topic.createdAt ??
      null,
  };
}

// -----------------------------------------------------------------------------
// Server / Channel normalization
// -----------------------------------------------------------------------------

function normalizeChannel(
  channel,
  server,
) {
  const roles =
    Object.fromEntries(
      (
        server.roles || []
      ).map(
        (role) => [
          role.id,
          normalizeRole(role),
        ],
      ),
    );

  const memberRoles = {};

  for (
    const member
    of server.members || []
  ) {
    if (
      member?.username &&
      member?.role?.id != null
    ) {
      memberRoles[
        member.username
      ] =
        member.role.id;
    }
  }

  const memberIds =
    Array.from(
      new Set(
        [
          server.ownerUsername,

          ...(
            server.members || []
          ).map(
            (member) =>
              member.username,
          ),
        ].filter(Boolean),
      ),
    );

  const memberRole =
    (
      server.roles || []
    ).find(
      (role) =>
        role.name ===
        'MEMBER',
    );

  return {
    id: channel.id,

    name:
      channel.name,

    type:
      channel.type,

    serverId:
      server.id,

    ownerId:
      server.ownerUsername,

    memberIds,

    mediaAllowed:
      channel.mediaRestricted !==
      true,

    // Channel entity currently has no createdAt.
    createdAt: null,

    topics:
      Object.fromEntries(
        (
          channel.topics || []
        ).map(
          (topic) => [
            topic.id,
            normalizeTopic(
              topic,
            ),
          ],
        ),
      ),

    roles,

    memberRoles,

    defaultRoleId:
      memberRole?.id ??
      null,
  };
}

function normalizeServer(
  server,
) {
  const memberIds =
    Array.from(
      new Set(
        [
          server.ownerUsername,

          ...(
            server.members || []
          ).map(
            (member) =>
              member.username,
          ),
        ].filter(Boolean),
      ),
    );

  return {
    id: server.id,

    name:
      server.name,

    iconUrl:
      server.iconUrl ??
      null,

    ownerId:
      server.ownerUsername,

    ownerUsername:
      server.ownerUsername,

    memberIds,

    channelIds:
      (
        server.channels || []
      ).map(
        (channel) =>
          channel.id,
      ),

    // Server entity currently has no createdAt.
    createdAt: null,
  };
}

function applyServer(server) {
  if (!server?.id) {
    return null;
  }

  const group =
    normalizeServer(
      server,
    );

  const serverChannels =
    Object.fromEntries(
      (
        server.channels || []
      ).map(
        (channel) => [
          channel.id,

          normalizeChannel(
            channel,
            server,
          ),
        ],
      ),
    );

  for (
    const username
    of group.memberIds
  ) {
    ensureUserReference(
      username,
    );
  }

  updateState((s) => {
    const channels = {
      ...s.channels,
    };

    /*
     * Remove old versions of channels
     * belonging to this server.
     */
    for (
      const [id, channel]
      of Object.entries(
        channels,
      )
    ) {
      if (
        channel.serverId ===
        server.id
      ) {
        delete channels[id];
      }
    }

    return {
      ...s,

      groups: {
        ...s.groups,

        [server.id]:
          group,
      },

      channels: {
        ...channels,
        ...serverChannels,
      },
    };
  });

  /*
   * Fetch public profiles for member usernames.
   * These API calls only enrich the frontend.
   */
  for (
    const username
    of group.memberIds
  ) {
    if (
      username !==
      state.currentUserId
    ) {
      loadUserProfile(
        username,
      );
    }
  }

  return group;
}

function applyServerList(
  servers,
) {
  const groups = {};
  const channels = {};
  const usernames =
    new Set();

  for (
    const server
    of servers || []
  ) {
    const group =
      normalizeServer(
        server,
      );

    groups[
      group.id
    ] = group;

    for (
      const username
      of group.memberIds
    ) {
      usernames.add(
        username,
      );
    }

    for (
      const channel
      of server.channels || []
    ) {
      channels[
        channel.id
      ] =
        normalizeChannel(
          channel,
          server,
        );
    }
  }

  updateState((s) => ({
    ...s,
    groups,
    channels,
  }));

  for (
    const username
    of usernames
  ) {
    ensureUserReference(
      username,
    );

    if (
      username !==
      state.currentUserId
    ) {
      loadUserProfile(
        username,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Message normalization
// -----------------------------------------------------------------------------

function attachmentKind(
  fileName,
) {
  const name =
    String(fileName || '')
      .toLowerCase();

  if (
    /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(
      name,
    )
  ) {
    return 'image';
  }

  if (
    /\.(mp4|webm|mov|mkv|avi)$/.test(
      name,
    )
  ) {
    return 'video';
  }

  if (
    /\.(mp3|wav|ogg|m4a|aac)$/.test(
      name,
    )
  ) {
    return 'audio';
  }

  return 'file';
}

function normalizeMessage(
  message,
  scope,
  scopeId,
) {
  const hasAttachment =
    !!message.attachmentFileName;

  return {
    id:
      message.id,

    scope,
    scopeId,

    topicId:
      message.topic?.id ??
      null,

    senderId:
      message.senderUsername,

    kind:
      hasAttachment
        ? attachmentKind(
            message
              .attachmentFileName,
          )
        : 'text',

    text:
      message.content ||
      '',

    fileName:
      message
        .attachmentFileName ||
      undefined,

    fileSize:
      undefined,

    dataUrl:
      hasAttachment
        ? `/api/media/${encodeURIComponent(
            message
              .attachmentFileName,
          )}`
        : undefined,

    createdAt:
      message.createdAt ??
      0,

    editedAt:
      message.isEdited
        ? (
            message.updatedAt ??
            message.createdAt
          )
        : undefined,
  };
}

function storeMessages(
  messages,
  scope,
  scopeId,
  replace = false,
) {
  updateState((s) => {
    const nextMessages =
      replace
        ? Object.fromEntries(
            Object.entries(
              s.messages,
            ).filter(
              (
                [
                  ,
                  message,
                ],
              ) =>
                !(
                  message.scope ===
                    scope &&
                  message.scopeId ===
                    scopeId
                ),
            ),
          )
        : {
            ...s.messages,
          };

    for (
      const message
      of messages
    ) {
      nextMessages[
        message.id
      ] = message;
    }

    return {
      ...s,
      messages:
        nextMessages,
    };
  });

  for (
    const message
    of messages
  ) {
    ensureUserReference(
      message.senderId,
    );

    if (
      message.senderId !==
      state.currentUserId
    ) {
      loadUserProfile(
        message.senderId,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// File upload helper
// -----------------------------------------------------------------------------

function dataUrlToFile(
  dataUrl,
  fileName,
) {
  if (
    !dataUrl ||
    !fileName
  ) {
    return null;
  }

  const [
    header,
    encoded,
  ] =
    dataUrl.split(',');

  if (!encoded) {
    return null;
  }

  const mime =
    /data:([^;]+)/.exec(
      header,
    )?.[1] ||
    'application/octet-stream';

  const binary =
    atob(encoded);

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let i = 0;
    i < binary.length;
    i += 1
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return new File(
    [bytes],
    fileName,
    {
      type: mime,
    },
  );
}

async function uploadAttachment(
  payload,
) {
  if (
    !payload.dataUrl ||
    !payload.fileName
  ) {
    return null;
  }

  const file =
    dataUrlToFile(
      payload.dataUrl,
      payload.fileName,
    );

  if (!file) {
    throw new Error(
      'Could not prepare the attachment for upload.',
    );
  }

  const formData =
    new FormData();

  formData.append(
    'file',
    file,
  );

  return api(
    '/api/media/upload',
    {
      method: 'POST',
      formData,
    },
  );
}

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function bootstrap() {
  if (state.initialized) {
    return ok();
  }

  if (
    !getAccessToken() &&
    !getRefreshToken()
  ) {
    updateState((s) => ({
      ...s,
      initialized: true,
    }));

    return ok();
  }

  try {
    const profile =
      await api(
        '/api/v1/users/me',
      );

    const user =
      userFromApi(
        profile,
      );

    updateState((s) => ({
      ...s,

      initialized: true,

      currentUserId:
        user.id,

      users: {
        ...s.users,

        [user.id]:
          user,
      },
    }));

    await loadServers();

    return ok(user);
  } catch (error) {
    clearTokens();

    updateState((s) => ({
      ...s,

      initialized: true,

      currentUserId:
        null,

      users: {},
      dms: {},
      groups: {},
      channels: {},
      messages: {},
    }));

    return fail(error);
  }
}

// =============================================================================
// AUTH
// =============================================================================

export async function register({
  name,
  email,
  username,
  password,
}) {
  try {
    const {
      firstName,
      lastName,
    } =
      splitName(name);

    await api(
      '/api/v1/users/register',
      {
        method:
          'POST',

        auth:
          false,

        body: {
          username,
          email,
          password,
          firstName,
          lastName,
        },
      },
    );

    /*
     * Register endpoint only returns a String.
     * Login immediately so frontend receives
     * tokens and the real UserProfile.
     */
    return login({
      username,
      password,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function login({
  username,
  password,
}) {
  try {
    const tokens =
      await api(
        '/api/v1/users/login',
        {
          method:
            'POST',

          auth:
            false,

          body: {
            username,
            password,
          },
        },
      );

    saveTokens(tokens);

    const profile =
      await api(
        '/api/v1/users/me',
      );

    const user =
      userFromApi(
        profile,
      );

    updateState((s) => ({
      ...s,

      initialized: true,

      currentUserId:
        user.id,

      users: {
        [user.id]:
          user,
      },

      dms: {},
      groups: {},
      channels: {},
      messages: {},
    }));

    await loadServers();

    /*
     * Presence isn't essential to login.
     */
    api(
      '/api/v1/presence/online',
      {
        method: 'POST',
      },
    ).catch(() => {});

    return ok(user);
  } catch (error) {
    clearTokens();

    return fail(error);
  }
}

export async function logout() {
  const refreshToken =
    getRefreshToken();

  try {
    await api(
      '/api/v1/presence/offline',
      {
        method: 'POST',
      },
    );
  } catch {
    // Continue logout.
  }

  try {
    if (refreshToken) {
      await api(
        '/api/v1/users/logout',
        {
          method:
            'POST',

          body: {
            refreshToken,
          },
        },
      );
    }
  } catch {
    // Still clear frontend session.
  }

  clearTokens();

  updateState((s) => ({
    ...s,

    currentUserId:
      null,

    users: {},
    dms: {},
    groups: {},
    channels: {},
    messages: {},
  }));

  return ok();
}

// =============================================================================
// USERS
// =============================================================================

export function getCurrentUser() {
  if (!state.currentUserId) {
    return null;
  }

  return (
    state.users[
      state.currentUserId
    ] || null
  );
}

export function getUser(id) {
  return (
    state.users[id] ||
    null
  );
}

export function listOtherUsers(
  excludeId,
) {
  /*
   * IMPORTANT:
   *
   * Backend has no "list all users" API.
   *
   * Therefore this only returns users the frontend
   * has learned about from server membership,
   * messages, DMs, etc.
   */
  return Object.values(
    state.users,
  )
    .filter(
      (user) =>
        user.id !==
        excludeId,
    )
    .sort(
      (a, b) =>
        a.username.localeCompare(
          b.username,
        ),
    );
}

export async function fetchUser(
  username,
) {
  try {
    const user =
      await loadUserProfile(
        username,
      );

    return ok(user);
  } catch (error) {
    return fail(error);
  }
}

export async function updateProfile(
  userId,
  actorId,
  {
    name,
    bio,
  },
) {
  if (
    userId !== actorId
  ) {
    return fail(
      'You can only edit your own profile.',
    );
  }

  const current =
    state.users[userId];

  if (!current) {
    return fail(
      'User not found.',
    );
  }

  try {
    const {
      firstName,
      lastName,
    } =
      splitName(
        name ||
        current.name,
      );

    const profile =
      await api(
        '/api/v1/users/me',
        {
          method:
            'PUT',

          body: {
            username:
              current.username,

            firstName,
            lastName,

            bio:
              bio ??
              current.bio ??
              '',

            avatarUrls:
              current.avatarUrls ||
              [],

            allowGroupAdditions:
              current.allowAddToGroup !==
              false,
          },
        },
      );

    const user =
      cacheUser(
        profile,
      );

    return ok(user);
  } catch (error) {
    return fail(error);
  }
}

export async function setAllowAddToGroup(
  userId,
  allow,
) {
  const current =
    state.users[userId];

  if (!current) {
    return fail(
      'User not found.',
    );
  }

  try {
    const {
      firstName,
      lastName,
    } =
      splitName(
        current.name,
      );

    const profile =
      await api(
        '/api/v1/users/me',
        {
          method:
            'PUT',

          body: {
            username:
              current.username,

            firstName,
            lastName,

            bio:
              current.bio ||
              '',

            avatarUrls:
              current.avatarUrls ||
              [],

            allowGroupAdditions:
              !!allow,
          },
        },
      );

    const user =
      cacheUser(
        profile,
      );

    return ok(user);
  } catch (error) {
    return fail(error);
  }
}

// =============================================================================
// SERVERS / GROUPS
// =============================================================================

export async function loadServers() {
  try {
    const servers =
      await api(
        '/api/v1/servers',
      );

    applyServerList(
      servers,
    );

    return ok(servers);
  } catch (error) {
    return fail(error);
  }
}

export async function loadServer(
  serverId,
) {
  try {
    const server =
      await api(
        `/api/v1/servers/${serverId}`,
      );

    applyServer(server);

    return ok(
      state.groups[
        server.id
      ],
    );
  } catch (error) {
    return fail(error);
  }
}

export function listGroupsForUser() {
  return Object.values(
    state.groups,
  );
}

export function getGroup(id) {
  return (
    state.groups[id] ||
    null
  );
}

export async function createGroup({
  name,
  memberIds = [],
}) {
  try {
    /*
     * Since our frontend user IDs are usernames,
     * memberIds can be sent directly.
     */
    const server =
      await api(
        '/api/v1/servers',
        {
          method:
            'POST',

          body: {
            name,

            iconUrl:
              null,

            initialMemberUsernames:
              memberIds,
          },
        },
      );

    /*
     * Reload it because ServerService creates
     * default roles/members after saving.
     */
    await loadServer(
      server.id,
    );

    return ok(
      state.groups[
        server.id
      ],
    );
  } catch (error) {
    return fail(error);
  }
}

export async function renameGroup(
  groupId,
  newName,
) {
  try {
    await api(
      `/api/v1/servers/${groupId}/name`,
      {
        method:
          'PUT',

        body: {
          name:
            newName,
        },
      },
    );

    await loadServer(
      groupId,
    );

    return ok(
      state.groups[
        groupId
      ],
    );
  } catch (error) {
    return fail(error);
  }
}

export async function deleteGroup(
  groupId,
) {
  try {
    await api(
      `/api/v1/servers/${groupId}`,
      {
        method:
          'DELETE',
      },
    );

    updateState((s) => {
      const groups = {
        ...s.groups,
      };

      const channels = {
        ...s.channels,
      };

      const messages = {
        ...s.messages,
      };

      delete groups[
        groupId
      ];

      for (
        const [
          id,
          channel,
        ]
        of Object.entries(
          channels,
        )
      ) {
        if (
          channel.serverId ===
          groupId
        ) {
          delete channels[id];

          for (
            const [
              messageId,
              message,
            ]
            of Object.entries(
              messages,
            )
          ) {
            if (
              message.scopeId ===
              channel.id
            ) {
              delete messages[
                messageId
              ];
            }
          }
        }
      }

      return {
        ...s,
        groups,
        channels,
        messages,
      };
    });

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function addMemberToGroup(
  groupId,
  userId,
) {
  try {
    await api(
      `/api/v1/servers/${groupId}/members`,
      {
        method:
          'POST',

        body: {
          username:
            userId,
        },
      },
    );

    await loadServer(
      groupId,
    );

    await loadUserProfile(
      userId,
    );

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function leaveGroup(
  groupId,
) {
  try {
    await api(
      `/api/v1/servers/${groupId}/leave`,
      {
        method:
          'DELETE',
      },
    );

    await loadServers();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function banGroupMember(
  groupId,
  username,
) {
  try {
    await api(
      `/api/v1/servers/${groupId}/members/${encodeURIComponent(
        username,
      )}/ban`,
      {
        method:
          'POST',
      },
    );

    await loadServer(
      groupId,
    );

    return ok();
  } catch (error) {
    return fail(error);
  }
}

// =============================================================================
// CHANNELS
// =============================================================================

export function listChannelsForUser() {
  return Object.values(
    state.channels,
  ).filter(
    (channel) =>
      channel.type !==
      'DIRECT',
  );
}

export function getChannel(id) {
  return (
    state.channels[id] ||
    null
  );
}

export async function createChannel({
  name,
  serverId,
  type = 'TEXT',
}) {
  try {
    const channel =
      await api(
        '/api/v1/channels',
        {
          method:
            'POST',

          body: {
            name,
            type,

            serverId:
              Number(
                serverId,
              ),
          },
        },
      );

    await loadServer(
      serverId,
    );

    return ok(
      state.channels[
        channel.id
      ] ||
      channel,
    );
  } catch (error) {
    return fail(error);
  }
}

export async function renameChannel(
  channelId,
  newName,
) {
  const channel =
    state.channels[
      channelId
    ];

  try {
    await api(
      `/api/v1/channels/${channelId}/name`,
      {
        method:
          'PUT',

        body: {
          name:
            newName,
        },
      },
    );

    if (
      channel?.serverId
    ) {
      await loadServer(
        channel.serverId,
      );
    }

    return ok(
      state.channels[
        channelId
      ],
    );
  } catch (error) {
    return fail(error);
  }
}

export async function deleteChannel(
  channelId,
) {
  const channel =
    state.channels[
      channelId
    ];

  try {
    await api(
      `/api/v1/channels/${channelId}`,
      {
        method:
          'DELETE',
      },
    );

    updateState((s) => {
      const channels = {
        ...s.channels,
      };

      const messages = {
        ...s.messages,
      };

      delete channels[
        channelId
      ];

      for (
        const [
          id,
          message,
        ]
        of Object.entries(
          messages,
        )
      ) {
        if (
          message.scopeId ===
          channelId
        ) {
          delete messages[id];
        }
      }

      return {
        ...s,
        channels,
        messages,
      };
    });

    if (
      channel?.serverId
    ) {
      await loadServer(
        channel.serverId,
      );
    }

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function toggleChannelMedia(
  channelId,
) {
  const channel =
    state.channels[
      channelId
    ];

  if (!channel) {
    return fail(
      'Channel not found.',
    );
  }

  try {
    /*
     * Backend accepts isRestricted.
     * Frontend stores mediaAllowed.
     */
    const isRestricted =
      channel.mediaAllowed;

    await api(
      `/api/v1/channels/${channelId}/media-restriction?isRestricted=${isRestricted}`,
      {
        method:
          'PUT',
      },
    );

    if (
      channel.serverId
    ) {
      await loadServer(
        channel.serverId,
      );
    }

    return ok(
      state.channels[
        channelId
      ],
    );
  } catch (error) {
    return fail(error);
  }
}

/*
 * Backend has no channel-specific add-member API.
 *
 * A channel belongs to a server, so adding a member
 * means adding them to the server.
 */
export async function addMemberToChannel(
  channelId,
  userId,
) {
  const channel =
    state.channels[
      channelId
    ];

  if (
    !channel?.serverId
  ) {
    return fail(
      'This channel is not attached to a server.',
    );
  }

  return addMemberToGroup(
    channel.serverId,
    userId,
  );
}

export async function assignChannelRole(
  channelId,
  targetUserId,
  roleId,
) {
  const channel =
    state.channels[
      channelId
    ];

  try {
    await api(
      `/api/v1/channels/${channelId}/members/role`,
      {
        method:
          'PUT',

        body: {
          targetUsername:
            targetUserId,

          newRoleId:
            Number(roleId),
        },
      },
    );

    if (
      channel?.serverId
    ) {
      await loadServer(
        channel.serverId,
      );
    }

    return ok();
  } catch (error) {
    return fail(error);
  }
}

// -----------------------------------------------------------------------------
// Channel permission selectors
// -----------------------------------------------------------------------------

export function getChannelRole(
  channel,
  userId,
) {
  if (!channel) {
    return null;
  }

  if (
    channel.ownerId ===
    userId
  ) {
    return {
      id: 'owner',
      name: 'OWNER',

      permissions: {
        post: true,
        deleteAnyMessage: true,
        manageMembers: true,
        manageTopics: true,
        manageChannel: true,
        manageRoles: true,
      },
    };
  }

  const roleId =
    channel.memberRoles?.[
      userId
    ];

  if (
    roleId == null
  ) {
    return null;
  }

  return (
    channel.roles?.[
      roleId
    ] || null
  );
}

export function getChannelPermissions(
  channel,
  userId,
) {
  return (
    getChannelRole(
      channel,
      userId,
    )?.permissions ||
    {
      post: false,
      deleteAnyMessage: false,
      manageMembers: false,
      manageTopics: false,
      manageChannel: false,
      manageRoles: false,
    }
  );
}

export function channelHasPermission(
  channel,
  userId,
  key,
) {
  return !!getChannelPermissions(
    channel,
    userId,
  )[key];
}

export function listChannelRoles(
  channel,
) {
  if (!channel) {
    return [];
  }

  return Object.values(
    channel.roles || {},
  );
}

// =============================================================================
// TOPICS
// =============================================================================

export async function createTopic(
  channelId,
  name,
) {
  try {
    const topic =
      await api(
        '/api/v1/topics',
        {
          method:
            'POST',

          body: {
            channelId:
              Number(
                channelId,
              ),

            name,
          },
        },
      );

    const normalized =
      normalizeTopic(
        topic,
      );

    updateState((s) => {
      const channel =
        s.channels[
          channelId
        ];

      if (!channel) {
        return s;
      }

      return {
        ...s,

        channels: {
          ...s.channels,

          [channelId]: {
            ...channel,

            topics: {
              ...channel.topics,

              [normalized.id]:
                normalized,
            },
          },
        },
      };
    });

    return ok(
      normalized,
    );
  } catch (error) {
    return fail(error);
  }
}

export async function deleteTopic(
  channelId,
  topicId,
) {
  try {
    await api(
      `/api/v1/topics/${topicId}`,
      {
        method:
          'DELETE',
      },
    );

    updateState((s) => {
      const channel =
        s.channels[
          channelId
        ];

      if (!channel) {
        return s;
      }

      const topics = {
        ...channel.topics,
      };

      const messages = {
        ...s.messages,
      };

      delete topics[
        topicId
      ];

      for (
        const [
          id,
          message,
        ]
        of Object.entries(
          messages,
        )
      ) {
        if (
          message.scopeId ===
            channelId &&
          message.topicId ===
            topicId
        ) {
          delete messages[id];
        }
      }

      return {
        ...s,

        channels: {
          ...s.channels,

          [channelId]: {
            ...channel,
            topics,
          },
        },

        messages,
      };
    });

    return ok();
  } catch (error) {
    return fail(error);
  }
}

// =============================================================================
// DIRECT MESSAGES
// =============================================================================

export async function startDm(
  targetUsername,
) {
  try {
    const channel =
      await api(
        '/api/v1/dm/start',
        {
          method:
            'POST',

          body: {
            targetUsername,
          },
        },
      );

    ensureUserReference(
      targetUsername,
    );

    await loadUserProfile(
      targetUsername,
    );

    /*
     * Backend returns a Channel.
     * We keep target username alongside it because
     * Direct Channel itself doesn't contain participants.
     */
    const dm = {
      id:
        channel.id,

      name:
        channel.name,

      type:
        channel.type,

      memberIds: [
        state.currentUserId,
        targetUsername,
      ],

      createdAt:
        null,
    };

    updateState((s) => ({
      ...s,

      dms: {
        ...s.dms,

        [dm.id]:
          dm,
      },
    }));

    return ok(dm);
  } catch (error) {
    return fail(error);
  }
}

export async function getOrCreateDm(
  userA,
  userB,
) {
  const target =
    userB ===
    state.currentUserId
      ? userA
      : userB;

  return startDm(
    target,
  );
}

export function listDmsForUser(
  userId,
) {
  return Object.values(
    state.dms,
  ).filter(
    (dm) =>
      dm.memberIds.includes(
        userId,
      ),
  );
}

export function getDm(id) {
  return (
    state.dms[id] ||
    null
  );
}

// =============================================================================
// MESSAGES
// =============================================================================

export async function loadMessages(
  scope,
  scopeId,
) {
  /*
   * Backend has no:
   *
   * /messages/server/{serverId}
   *
   * Messages are stored in channels.
   */
  if (
    scope === 'group'
  ) {
    return fail(
      'The backend has no direct server/group message endpoint.',
    );
  }

  try {
    const messages =
      await api(
        `/api/v1/messages/channel/${scopeId}`,
      );

    const normalized =
      (
        messages || []
      ).map(
        (message) =>
          normalizeMessage(
            message,
            scope,
            scopeId,
          ),
      );

    storeMessages(
      normalized,
      scope,
      scopeId,
      true,
    );

    return ok(
      normalized,
    );
  } catch (error) {
    return fail(error);
  }
}

export function listMessages(
  scope,
  scopeId,
  topicId,
) {
  return Object.values(
    state.messages,
  )
    .filter(
      (message) => {
        if (
          message.scope !==
            scope ||
          message.scopeId !==
            scopeId
        ) {
          return false;
        }

        if (
          scope ===
            'channel' &&
          topicId != null &&
          message.topicId !==
            topicId
        ) {
          return false;
        }

        return true;
      },
    )
    .sort(
      (a, b) =>
        a.createdAt -
        b.createdAt,
    );
}

export async function searchConversationMessages(
  scope,
  scopeId,
  topicId,
  query,
) {
  if (
    scope === 'group'
  ) {
    return fail(
      'The backend has no direct server/group message endpoint.',
    );
  }

  try {
    const result =
      await api(
        `/api/v1/messages/channel/${scopeId}/search?keyword=${encodeURIComponent(
          query,
        )}&limit=20`,
      );

    const messages =
      (
        result?.messages || []
      ).map(
        (message) =>
          normalizeMessage(
            message,
            scope,
            scopeId,
          ),
      );

    return ok(
      messages.filter(
        (message) =>
          topicId == null ||
          message.topicId ===
          topicId,
      ),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function sendMessage(
  payload,
) {
  /*
   * Backend does not support posting directly to a Server.
   */
  if (
    payload.scope ===
    'group'
  ) {
    return fail(
      'The backend sends messages to channels, not directly to a server/group.',
    );
  }

  try {
    /*
     * If the frontend selected a file,
     * upload it first.
     */
    const attachmentFileName =
      await uploadAttachment(
        payload,
      );

    const message =
      await api(
        '/api/v1/messages',
        {
          method:
            'POST',

          body: {
            content:
              payload.text ||
              '',

            channelId:
              Number(
                payload.scopeId,
              ),

            attachmentFileName,

            topicId:
              payload.topicId !=
              null
                ? Number(
                    payload.topicId,
                  )
                : null,
          },
        },
      );

    const normalized =
      normalizeMessage(
        message,
        payload.scope,
        payload.scopeId,
      );

    storeMessages(
      [normalized],
      payload.scope,
      payload.scopeId,
    );

    return ok(
      normalized,
    );
  } catch (error) {
    return fail(error);
  }
}

/*
 * Old frontend called this function.
 * There is no frontend fake queue anymore.
 */
export async function sendOrQueueMessage(
  payload,
) {
  return sendMessage(
    payload,
  );
}

export async function editMessage(
  messageId,
  actorId,
  {
    text,
  },
) {
  try {
    const previous =
      state.messages[
        messageId
      ];

    const message =
      await api(
        `/api/v1/messages/${messageId}`,
        {
          method:
            'PUT',

          body: {
            content:
              text,
          },
        },
      );

    const normalized =
      normalizeMessage(
        message,

        previous?.scope ||
        'channel',

        previous?.scopeId,
      );

    storeMessages(
      [normalized],
      normalized.scope,
      normalized.scopeId,
    );

    return ok(
      normalized,
    );
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMessage(
  messageId,
) {
  try {
    await api(
      `/api/v1/messages/${messageId}`,
      {
        method:
          'DELETE',
      },
    );

    updateState((s) => {
      const messages = {
        ...s.messages,
      };

      delete messages[
        messageId
      ];

      return {
        ...s,
        messages,
      };
    });

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export function canManageMessagesIn(
  scope,
  scopeId,
  actorId,
) {
  if (
    scope !==
    'channel'
  ) {
    return false;
  }

  return channelHasPermission(
    state.channels[
      scopeId
    ],
    actorId,
    'deleteAnyMessage',
  );
}

// =============================================================================
// FEATURES NOT EXPOSED BY CURRENT BACKEND API
// =============================================================================
//
// These intentionally do NOT simulate backend behavior.
//
// They exist only so old UI references do not immediately crash while you
// remove/disable those UI features.
// =============================================================================

function unsupported(feature) {
  return Promise.resolve(
    fail(
      `${feature} is not exposed by the current backend API.`,
    ),
  );
}

// No fake offline mode.
export function isOffline() {
  return (
    typeof navigator !==
      'undefined' &&
    navigator.onLine ===
      false
  );
}

export function setSimulateOffline() {
  return unsupported(
    'Simulated offline mode',
  );
}

// No client-side outbox.
export function listOutboxForConversation() {
  return [];
}

export function retryOutboxItem() {
  return unsupported(
    'Outbox retry',
  );
}

export function removeOutboxItem() {
  return unsupported(
    'Outbox removal',
  );
}

export function flushOutbox() {}

// No notification REST controller.
export function listNotifications() {
  return [];
}

export function unreadNotificationCount() {
  return 0;
}

export function markNotificationRead() {
  return unsupported(
    'Notifications',
  );
}

export function markAllNotificationsRead() {
  return unsupported(
    'Notifications',
  );
}

// No scheduled-message REST routes.
export function processDueScheduledMessages() {}

export function scheduleMessage() {
  return unsupported(
    'Scheduled messages',
  );
}

export function editScheduledMessage() {
  return unsupported(
    'Scheduled messages',
  );
}

export function cancelScheduledMessage() {
  return unsupported(
    'Scheduled messages',
  );
}

export function listScheduledForUser() {
  return [];
}

// Backend supports assigning an existing role,
// but not creating/editing/deleting role definitions.
export function createChannelRole() {
  return unsupported(
    'Role creation',
  );
}

export function updateChannelRole() {
  return unsupported(
    'Role editing',
  );
}

export function deleteChannelRole() {
  return unsupported(
    'Role deletion',
  );
}