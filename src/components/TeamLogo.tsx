import { useState } from "react";
import { initials } from "../lib/format";

interface Props {
  name: string;
  src: string | null | undefined;
  size?: number;
}

/** Team logo from the API, with a lettered tile when the logo is missing or fails to load. */
export function TeamLogo({ name, src, size = 32 }: Props) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };
  if (!src || failed) {
    return (
      <span className="logo logo-fallback" style={style} aria-hidden="true">
        {initials(name)}
      </span>
    );
  }
  return (
    <img
      className="logo"
      style={style}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={() => setFailed(true)}
    />
  );
}
