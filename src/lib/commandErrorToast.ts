import { toast } from "@/hooks/use-toast";
import { resolveCommandErrorMessage, type CommandErrorInput } from "@/lib/commandErrorMessages";

/** Destructive toast with mapped command error description (DS7). */
export function showCommandErrorToast(
  title: string,
  input: CommandErrorInput,
  fallback?: string,
): void {
  toast({
    title,
    description: resolveCommandErrorMessage(input, fallback),
    variant: "destructive",
  });
}
