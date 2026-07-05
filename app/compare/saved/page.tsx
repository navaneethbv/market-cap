import Link from "next/link";
import { redirect } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import {
  deleteSavedComparison,
  updateSavedComparison,
} from "@/app/compare/saved/actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

type SavedComparison = {
  id: string;
  name: string;
  symbols: string[];
  created_at: string;
};

export default async function SavedComparisonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/compare/saved");
  }

  const { data, error } = await supabase
    .from("saved_comparisons")
    .select("id,name,symbols,created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const comparisons = (data ?? []) as SavedComparison[];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Compare</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Saved comparisons
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Keep reusable symbol sets for repeat market checks.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link href="/compare">New comparison</Link>
          </Button>
        </div>
      </section>

      {comparisons.length === 0 ? (
        <section className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <Save className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">
            No saved comparisons
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Save a symbol group from the comparison page to reuse it here.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link href="/compare">Compare stocks</Link>
          </Button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Symbols</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((comparison) => (
                <TableRow key={comparison.id}>
                  <TableCell>
                    <form
                      action={updateSavedComparison}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <input type="hidden" name="id" value={comparison.id} />
                      <input
                        name="name"
                        defaultValue={comparison.name}
                        aria-label={`Name for ${comparison.name}`}
                        className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 min-w-0 rounded-full border px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      />
                      <input
                        type="hidden"
                        name="symbols"
                        value={comparison.symbols.join(",")}
                      />
                      <Button type="submit" size="sm" variant="outline">
                        Rename
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/compare?symbols=${comparison.symbols.join(",")}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {comparison.symbols.join(", ")}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/compare?symbols=${comparison.symbols.join(",")}`}
                        >
                          Open
                        </Link>
                      </Button>
                      <form action={deleteSavedComparison}>
                        <input type="hidden" name="id" value={comparison.id} />
                        <Button
                          type="submit"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${comparison.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
