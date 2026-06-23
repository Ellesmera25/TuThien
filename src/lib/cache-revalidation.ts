import { revalidateTag } from "next/cache";

export const noStoreHeaders = {
  "cache-control": "no-store, max-age=0",
} as const;

export function revalidateCacheTag(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

export function revalidateCacheTags(tags: readonly string[]) {
  for (const tag of tags) {
    revalidateCacheTag(tag);
  }
}
