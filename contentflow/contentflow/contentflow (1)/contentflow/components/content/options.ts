export const STATUS_OPTIONS = [
  { value: "idea", label: "Idea" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export const TYPE_OPTIONS = [
  { value: "post", label: "Post" },
  { value: "story", label: "Story" },
  { value: "reel", label: "Reel" },
  { value: "video", label: "Video" },
  { value: "carousel", label: "Carousel" },
] as const;

export const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
] as const;
