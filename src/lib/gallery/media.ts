import type { GalleryItem, GalleryMediaType } from "@/types";

export function isGalleryVideo(
  item: Pick<GalleryItem, "media_type" | "video_url">
): boolean {
  return item.media_type === "video" && Boolean(item.video_url?.trim());
}

export function galleryMediaType(
  item: Pick<GalleryItem, "media_type" | "video_url">
): GalleryMediaType {
  return isGalleryVideo(item) ? "video" : "image";
}
