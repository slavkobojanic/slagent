import { toast } from "sonner"
import { errorText } from "@/lib/format"

// The main process owns the library, so a failed call has nothing to roll back: it only shows a toast.
// The result says whether the call worked, so a caller can skip what depends on it.
export async function toastFailure(task: () => Promise<unknown>): Promise<boolean> {
  try {
    await task()
    return true
  } catch (error) {
    toast.error(errorText(error))
    return false
  }
}
