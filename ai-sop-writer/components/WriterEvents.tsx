"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  stampTryBuilderLinks,
  templateSlugFromPath,
  trackWriterEvent,
} from "@/lib/writer-events";

export function WriterEvents() {
  const pathname = usePathname();

  useEffect(() => {
    trackWriterEvent("writer_page_view", {
      path: pathname,
      templateSlug: templateSlugFromPath(pathname),
    });
    stampTryBuilderLinks();
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[data-try-builder]");
      if (!(link instanceof HTMLAnchorElement)) return;
      stampTryBuilderLinks();
      const slug = link.dataset.templateSlug || templateSlugFromPath(window.location.pathname);
      trackWriterEvent("writer_try_builder_click", {
        path: window.location.pathname,
        templateSlug: slug || null,
      });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
