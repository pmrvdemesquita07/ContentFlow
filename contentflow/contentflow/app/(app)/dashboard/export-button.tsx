"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportPdfButton() {
  return (
    <Button variant="outline" size="sm" className="print-hide" onClick={() => window.print()}>
      <Printer className="size-4" />
      Export PDF
    </Button>
  );
}
