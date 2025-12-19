import { useState, useCallback } from "react";
import type { IgMediaItem } from "@/utils/ig";

type ClickAction = "modal" | "instagram" | "filter";

export function usePostClick(defaultAction: ClickAction = "modal") {
  const [selectedPost, setSelectedPost] = useState<IgMediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePostClick = useCallback((post: IgMediaItem, action?: ClickAction) => {
    const finalAction = action || defaultAction;

    switch (finalAction) {
      case "instagram":
        if (post.permalink) {
          window.open(post.permalink, "_blank", "noopener,noreferrer");
        }
        break;
      
      case "modal":
        setSelectedPost(post);
        setIsModalOpen(true);
        break;
      
      case "filter":
        setSelectedPost(post);
        break;
    }
  }, [defaultAction]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPost(null);
  }, []);

  return {
    selectedPost,
    isModalOpen,
    handlePostClick,
    closeModal,
  };
}
