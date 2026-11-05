import { useEffect } from "react";

const SITE_NAME = "CIDB";
const DEFAULT_TITLE = "CIDB - Caving Incident DB";

function setDescription(content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = "description";
    document.head.appendChild(tag);
  }
  tag.content = content;
}

export function usePageMeta(title: string | null, description: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    setDescription(description);
  }, [title, description]);
}
