import { Suspense } from "react";
import { LifeOSWorkspace } from "@/components/LifeOSWorkspace";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#09090b] text-xs text-zinc-400">
          Initializing LifeOS AI...
        </div>
      }
    >
      <LifeOSWorkspace />
    </Suspense>
  );
}
