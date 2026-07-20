import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/discover" className="flex max-w-md items-center gap-2">
      <Input name="niche" defaultValue={defaultValue} placeholder="Search by niche (e.g. fitness)" />
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
