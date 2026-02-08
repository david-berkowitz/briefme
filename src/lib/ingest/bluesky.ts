export type BlueskyPost = {
  authorName: string;
  authorUrl: string;
  postUrl: string;
  content: string;
  postedAt: string | null;
};

export type BlueskyProfile = {
  handle: string;
  displayName: string | null;
  avatar: string | null;
};

const normalizeHandle = (input: string) => {
  if (!input) return null;
  const trimmed = input.trim();

  if (trimmed.startsWith("http")) {
    const match = trimmed.match(/bsky\.app\/profile\/([^/]+)/i);
    return match ? match[1] : null;
  }

  return trimmed.replace(/^@/, "");
};

const buildPostUrl = (handle: string, uri: string) => {
  const parts = uri.split("/");
  const rkey = parts[parts.length - 1];
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
};

export const fetchBlueskyProfile = async (handleOrUrl: string) => {
  const handle = normalizeHandle(handleOrUrl);
  if (!handle) {
    return null;
  }

  const url = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { displayName?: string; avatar?: string };

  return {
    handle,
    displayName: payload.displayName ?? null,
    avatar: payload.avatar ?? null
  } as BlueskyProfile;
};

export const fetchBlueskyPosts = async (handleOrUrl: string) => {
  const handle = normalizeHandle(handleOrUrl);
  if (!handle) {
    return [] as BlueskyPost[];
  }

  const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=5`;
  const response = await fetch(url, { next: { revalidate: 0 } });

  if (!response.ok) {
    return [] as BlueskyPost[];
  }

  const payload = (await response.json()) as {
    feed: Array<{
      post: {
        uri: string;
        record?: { text?: string };
        author?: { displayName?: string; handle?: string };
        indexedAt?: string;
      };
    }>;
  };

  return payload.feed.map((item) => {
    const post = item.post;
    const authorHandle = post.author?.handle ?? handle;
    const authorName = post.author?.displayName ?? authorHandle;

    return {
      authorName,
      authorUrl: `https://bsky.app/profile/${authorHandle}`,
      postUrl: buildPostUrl(authorHandle, post.uri),
      content: post.record?.text ?? "",
      postedAt: post.indexedAt ?? null
    } as BlueskyPost;
  });
};
