"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
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
  const [isAdmin, setIsAdmin] = useState(user.isAdmin || false);
  const [isWhiteListed, setIsWhiteListed] = useState(user.isWhiteListed || false);
  const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error"; message: string; isLoading: boolean }>({ status: "success", message: "", isLoading: false });
  const router = useRouter();
  const { data: session } = useSession();

  // Keep local state in sync with the latest user data each time the dialog is opened
  useEffect(() => {
    if (open) {
      setWallet(user.wallet || "");
      setEmail(user.email || "");
      setUsername(user.username || "");
      setIsAdmin(user.isAdmin || false);
      setIsWhiteListed(user.isWhiteListed || false);
    }
  }, [user, open]);

  // Auto-whitelist when admin is selected
  useEffect(() => {
    if (isAdmin && !isWhiteListed) {
      setIsWhiteListed(true);
    }
  }, [isAdmin, isWhiteListed]);

  // Get display text for roles (matches the column display format)
  const getRoleDisplayText = () => {
    const roles: string[] = [];
    if (isAdmin) roles.push("Admin");
    if (isWhiteListed) roles.push("Whitelisted");
    if (roles.length === 0) roles.push("User");
    return roles.join(", ");
  };

  async function handleSave() {
    setUploadStatus({ status: "success", message: "", isLoading: true });
    const resp = await fetch(`/api/admin/whitelist-user/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        wallet, 
        email, 
        username, 
        isAdmin, 
        isWhiteListed 
      }),
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
              value=""
              disabled={!session?.user?.isAdmin}
            >
              <SelectTrigger className="border border-gray-300 focus:border-black focus:outline-none">
                <SelectValue asChild>
                  <span>{getRoleDisplayText()}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div 
                  className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${!isAdmin && !isWhiteListed ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsAdmin(false);
                    setIsWhiteListed(false);
                  }}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {!isAdmin && !isWhiteListed && <Check className="h-4 w-4" />}
                  </span>
                  User
                </div>
                
                <div 
                  className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${isWhiteListed ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsWhiteListed(!isWhiteListed);
                    // If unchecking whitelisted and admin is checked, uncheck admin too
                    if (isWhiteListed && isAdmin) {
                      setIsAdmin(false);
                    }
                  }}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isWhiteListed && <Check className="h-4 w-4" />}
                  </span>
                  Whitelisted
                </div>
                
                <div 
                  className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${isAdmin ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsAdmin(!isAdmin);
                    // Auto-whitelist when enabling admin
                    if (!isAdmin) {
                      setIsWhiteListed(true);
                    }
                  }}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isAdmin && <Check className="h-4 w-4" />}
                  </span>
                  Admin
                </div>
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