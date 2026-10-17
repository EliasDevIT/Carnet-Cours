"use client";

import { useState } from "react";

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Favicon du site, avec l'initiale du lien en secours. */
export function LinkIcon({ url, title, size = 36 }: { url: string; title: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-[9px] border border-line bg-sunken"
      style={{ width: size, height: size }}
    >
      {host && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
          alt=""
          width={size * 0.55}
          height={size * 0.55}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="display text-sm font-bold text-muted">{title.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

export { hostOf };
