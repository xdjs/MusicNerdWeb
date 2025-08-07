"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { User } from "@/server/db/DbTypes";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface WhitelistUserEditDialogProps {
  user: User;
}

export default function WhitelistUserEditDialog({ user }: WhitelistUserEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState(user.wallet || "");
  const [email, setEmail] = useState(user.email || "");
  const [username, setUsername] = useState(user.username || "");
  const [role, setRole] = useState(() => {
    if (user.isAdmin) return "admin";
    if (user.isWhiteListed) return "whitelisted";
    return "user";
  });
  const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error"; message: string; isLoading: boolean }>({ status: "success", message: "", isLoading: false });
  const router = useRouter();
  const { data: session } = useSession();

  // Keep local state in sync with the latest user data each time the dialog is opened
  useEffect(() => {
    if (open) {
      setWallet(user.wallet || "");
      setEmail(user.email || "");
      setUsername(user.username || "");
      setRole(() => {
        if (user.isAdmin) return "admin";
        if (user.isWhiteListed) return "whitelisted";
        return "user";
      });
    }
  }, [user, open]);

  async function handleSave() {
    setUploadStatus({ status: "success", message: "", isLoading: true });
    const resp = await fetch(`/api/admin/whitelist-user/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ wallet, email, username, role }),
      credentials: "same-origin",
    });
    const data = await resp.json();
    setUploadStatus({ status: data.status, message: data.message, isLoading: false });
    if (data.status === "success") {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] text-black">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update username, email, or wallet address.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Wallet Address</label>
            <Input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="border border-gray-300 focus:border-black focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 focus:border-black focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border border-gray-300 focus:border-black focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select 
              value={role} 
              onValueChange={setRole}
              disabled={!session?.user?.isAdmin}
            >
              <SelectTrigger className="border border-gray-300 focus:border-black focus:outline-none">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="whitelisted">Whitelisted</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {!session?.user?.isAdmin && (
              <p className="text-xs text-gray-500">Only admins can edit user roles</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ID</label>
            <Input value={user.id} readOnly className="bg-gray-100 border border-gray-200 cursor-not-allowed" />
          </div>
          {uploadStatus.status === "error" && (
            <p className="text-red-500 text-sm">{uploadStatus.message}</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={uploadStatus.isLoading}>
            {uploadStatus.isLoading ? (
              <img className="w-4 h-4" src="/spinner.svg" alt="Loading" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 