"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toggleAdminAction as toggleAdmin } from "@/app/actions/serverActions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import SearchBar from "./UserSearch";

export function AddRemoveAdminDialog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();
  const [users, setUsers] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<{
    status: "success" | "error";
    message: string;
    isLoading: boolean;
  }>({ status: "success", message: "", isLoading: false });
  const [query, setQuery] = useState<string>("");

  async function handleAction() {
    if (!users.length) return;
    setUploadStatus({ status: "success", message: "", isLoading: true });
    const resp = await toggleAdmin(users);
    setUploadStatus({ status: resp.status, message: resp.message, isLoading: false });
    if (resp.status === "success") {
      router.refresh();
      setIsDialogOpen(false);
      setUsers([]);
    }
  }

  function removeFromUsers(user: string) {
    setUsers(users.filter((u) => u !== user));
  }

  function setUserWithFilter(user: string) {
    setUsers([...users.filter((u) => u !== user), user]);
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add/Remove Admin</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] text-black">
        <DialogHeader>
          <DialogTitle>Update Admin Users</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Insert wallet address or username</p>
          <SearchBar
            setUsers={(user: string) => setUserWithFilter(user)}
            query={query}
            setQuery={setQuery}
          />
          <div className="flex flex-wrap gap-2">
            {users.map((user) => (
              <Button
                variant="outline"
                onClick={() => removeFromUsers(user)}
                key={user}
              >
                {user} <X className="w-4 h-4 ml-1" />
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleAction}
            disabled={!users.length || uploadStatus.isLoading}
          >
            {uploadStatus.isLoading ? (
              <img className="w-4 h-4" src="/spinner.svg" alt="loading" />
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
