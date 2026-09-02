"use client";

import { useState, useTransition } from "react";
import { Download, TriangleAlert } from "lucide-react";
import { exportMyData, deleteMyAccount } from "@/app/actions/privacy";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PrivacySection({ email }: { email: string }) {
  const [exporting, startExport] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function handleExport() {
    setExportError(null);
    startExport(async () => {
      const result = await exportMyData();
      if ("error" in result) {
        setExportError(result.error ?? "Não foi possível preparar o ficheiro.");
        return;
      }
      // Built in the browser so the file never has to be stored on a server.
      const url = URL.createObjectURL(new Blob([result.json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `contentflow-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleDelete(formData: FormData) {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteMyAccount(undefined, formData);
      if (result?.error) setDeleteError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Os teus dados</CardTitle>
        <CardDescription>
          Descarrega tudo o que guardamos sobre ti, ou apaga a conta de vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-fit" onClick={handleExport} disabled={exporting}>
            <Download className="size-4" />
            {exporting ? "A preparar…" : "Descarregar os meus dados"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Um ficheiro JSON com a tua conta e as workspaces a que pertences: conteúdo, campanhas,
            contratos, métricas e comentários. Os tokens de acesso das redes ficam de fora — são
            credenciais, não dados pessoais.
          </p>
          {exportError && <p className="text-sm text-destructive">{exportError}</p>}
        </div>

        <div className="flex flex-col gap-3 border-t pt-5">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Apagar a conta</p>
              <p className="text-xs text-muted-foreground">
                As workspaces onde és o único membro são apagadas por completo, com tudo o que têm
                dentro. Nas que partilhas com outras pessoas, o trabalho fica — passa para outro
                membro — e só a tua conta desaparece. Não há forma de reverter.
              </p>
            </div>
          </div>

          {!confirming ? (
            <Button
              variant="outline"
              className="w-fit border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setConfirming(true)}
            >
              Apagar a minha conta
            </Button>
          ) : (
            <form action={handleDelete} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                Para confirmar, escreve <span className="font-medium text-foreground">{email}</span>
                <Input
                  name="confirmEmail"
                  autoComplete="off"
                  placeholder={email}
                  className="max-w-sm"
                  required
                />
              </label>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" disabled={deleting}>
                  {deleting ? "A apagar…" : "Apagar definitivamente"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setConfirming(false);
                    setDeleteError(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
