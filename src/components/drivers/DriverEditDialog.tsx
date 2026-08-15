import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileAttachment } from "@/components/common/FileAttachment";
import { DriverAvatar } from "@/components/drivers/DriverAvatar";
import { supabase } from "@/integrations/supabase/client";
import { uploadDocFile } from "@/lib/docs/storage";
import type { DriverRow } from "@/lib/drivers/api";

/** Edição do motorista: dados pessoais, CNH e troca de foto de perfil. */
export function DriverEditDialog({
  driver,
  trigger,
}: {
  driver: DriverRow;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(driver.name);
  const [phone, setPhone] = useState(driver.phone ?? "");
  const [license, setLicense] = useState(driver.license_number ?? "");
  const [category, setCategory] = useState(driver.license_category ?? "");
  const [expires, setExpires] = useState(driver.license_expires_on ?? "");
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(driver.name);
    setPhone(driver.phone ?? "");
    setLicense(driver.license_number ?? "");
    setCategory(driver.license_category ?? "");
    setExpires(driver.license_expires_on ?? "");
    setPhoto(null);
  }, [open, driver]);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome do condutor.");
      const photoPath = photo ? await uploadDocFile(photo, "drivers") : null;
      const { error } = await supabase
        .from("drivers")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          license_number: license.trim() || null,
          license_category: category.trim() || null,
          license_expires_on: expires || null,
          ...(photoPath ? { photo_path: photoPath } : {}),
        })
        .eq("id", driver.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Motorista atualizado!");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["drivers"] });
      qc.invalidateQueries({ queryKey: ["driver", driver.id] });
      qc.invalidateQueries({ queryKey: ["driver-photo"] });
      qc.invalidateQueries({ queryKey: ["driver-ranking"] });
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível salvar o motorista. Verifique sua conexão e tente de novo.")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label={`Editar ${driver.name}`}
          >
            <Pencil className="size-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar motorista</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex items-center gap-3">
            <DriverAvatar name={driver.name} photoPath={driver.photo_path} size={56} />
            <p className="text-xs text-muted-foreground">
              Envie uma nova imagem abaixo para substituir a foto de perfil.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${driver.id}`}>Nome</Label>
            <Input
              id={`edit-name-${driver.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="h-11 text-base"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-phone-${driver.id}`}>Telefone</Label>
              <Input
                id={`edit-phone-${driver.id}`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                inputMode="tel"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-cat-${driver.id}`}>Categoria CNH</Label>
              <Input
                id={`edit-cat-${driver.id}`}
                value={category}
                onChange={(e) => setCategory(e.target.value.toUpperCase())}
                maxLength={5}
                className="h-11 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-cnh-${driver.id}`}>Nº da CNH</Label>
              <Input
                id={`edit-cnh-${driver.id}`}
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                maxLength={30}
                inputMode="numeric"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-exp-${driver.id}`}>Validade</Label>
              <Input
                id={`edit-exp-${driver.id}`}
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                className="h-11 text-base"
              />
            </div>
          </div>

          <FileAttachment label="Nova foto de perfil" file={photo} onChange={setPhoto} />

          <DialogFooter>
            <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
