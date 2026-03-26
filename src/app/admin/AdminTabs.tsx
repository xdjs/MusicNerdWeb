"use client";

import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminTabsProps {
  ugcContent: ReactNode;
  usersContent: ReactNode;
  mcpKeysContent: ReactNode;
  agentWorkContent: ReactNode;
  ugcCount: number;
}

export default function AdminTabs({
  ugcContent,
  usersContent,
  mcpKeysContent,
  agentWorkContent,
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
        <TabsTrigger value="agent-work">Agent Work</TabsTrigger>
      </TabsList>
      <TabsContent value="ugc">{ugcContent}</TabsContent>
      <TabsContent value="users">{usersContent}</TabsContent>
      <TabsContent value="mcp-keys">{mcpKeysContent}</TabsContent>
      <TabsContent value="agent-work">{agentWorkContent}</TabsContent>
    </Tabs>
  );
}
