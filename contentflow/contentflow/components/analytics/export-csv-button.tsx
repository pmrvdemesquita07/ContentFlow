"use client";

import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportCsvButton({ filename, csv }: { filename: string; csv: string }) {
  function handleClick() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" className="print-hide" onClick={handleClick}>
      <FileSpreadsheet className="size-4" />
      Export CSV
    </Button>
  );
}
