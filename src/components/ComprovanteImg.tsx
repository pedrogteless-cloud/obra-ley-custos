import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ComprovanteImg({
  path,
  className,
  onClick,
}: {
  path: string | null | undefined;
  className?: string;
  onClick?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let ativo = true;
    supabase.storage
      .from("comprovantes")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (ativo && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      ativo = false;
    };
  }, [path]);
  if (!path) return null;
  if (!url) return <div className={`${className ?? ""} bg-muted animate-pulse`} />;
  return (
    <img
      src={url}
      alt="Comprovante"
      className={className}
      onClick={onClick}
      loading="lazy"
    />
  );
}
