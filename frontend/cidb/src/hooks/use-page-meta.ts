import { useEffect } from "react";

const SITE_NAME = "CIDB";
const DEFAULT_TITLE = "CIDB - Caving Incident DB";

function getDescriptionTag() {
  return document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
}

function setDescription(content: string) {
  let tag = getDescriptionTag();
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = "description";
    document.head.appendChild(tag);
  }
  tag.content = content;
}

export function usePageMeta(title: string | null, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousDescription = getDescriptionTag()?.content;
    document.title = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    setDescription(description);
    return () => {
      document.title = previousTitle;
      setDescription(previousDescription ?? "");
    };
  }, [title, description]);
}
