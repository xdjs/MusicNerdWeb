"use client";

import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminTabsProps {
  ugcContent: ReactNode;
  usersContent: ReactNode;
  mcpKeysContent: ReactNode;
  ugcCount: number;
}

export default function AdminTabs({
  ugcContent,
  usersContent,
  mcpKeysContent,
  ugcCount,
}: AdminTabsProps) {
  return (
    <Tabs defaultValue="ugc">
      <TabsList>
        <TabsTrigger value="ugc">
          UGC ({ugcCount})
        </TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="mcp-keys">MCP Keys</TabsTrigger>
      </TabsList>
      <TabsContent value="ugc">{ugcContent}</TabsContent>
      <TabsContent value="users">{usersContent}</TabsContent>
      <TabsContent value="mcp-keys">{mcpKeysContent}</TabsContent>
    </Tabs>
  );
}
