"use client";

import { disconnectSocialAccount } from "@/app/actions/social";
import { Button } from "@/components/ui/button";

export function DisconnectButton({ id }: { id: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        if (confirm("Disconnect this account?")) disconnectSocialAccount(id);
      }}
    >
      Disconnect
    </Button>
  );
}
