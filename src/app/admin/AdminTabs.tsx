"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Link2, BadgeCheck, Users, KeyRound, Activity, Database, ArrowUpRight } from "lucide-react";
import styles from "@/components/community/Community.module.css";
import surface from "@/app/profile/ProfileConcept.module.css";

interface AdminTabsProps {
  ugcContent: ReactNode; usersContent: ReactNode; claimsContent: ReactNode;
  mcpKeysContent: ReactNode; agentWorkContent: ReactNode; artistDataContent: ReactNode;
  ugcCount: number; claimsCount: number;
}

export default function AdminTabs({ugcContent,usersContent,claimsContent,mcpKeysContent,agentWorkContent,artistDataContent,ugcCount,claimsCount}: AdminTabsProps) {
  const [value,setValue] = useState('ugc');
  const sections = [
    {value:'ugc',label:'Link submissions',title:'Review submitted links',description:'Check the source and artist before approving a community contribution.',icon:Link2,count:ugcCount,content:ugcContent},
    {value:'claims',label:'Artist claims',title:'Connect artists with their pages',description:'Review ownership requests and manage existing artist claims.',icon:BadgeCheck,count:claimsCount,content:claimsContent},
    {value:'artist-data',label:'Artist data',title:'A fuller picture of the catalog',description:'See platform coverage, profile completeness, and enrichment readiness.',icon:Database,content:artistDataContent},
    {value:'users',label:'People',title:'The people building Music Nerd',description:'Find a contributor and manage their access and leaderboard visibility.',icon:Users,content:usersContent},
    {value:'mcp-keys',label:'MCP keys',title:'Connections to Music Nerd',description:'Manage the keys used by connected tools and agents.',icon:KeyRound,content:mcpKeysContent},
    {value:'agent-work',label:'Agent work',title:'Research behind the profiles',description:'Follow worker health, recent activity, and ongoing catalog work.',icon:Activity,content:agentWorkContent},
  ];
  const currentSection = sections.find(section => section.value === value)!;
  return <Tabs value={value} onValueChange={setValue} className={styles.page}>
    <div className={styles.reviewOverview}>
      <button type="button" className={`${surface.surface} ${styles.reviewCard}`} onClick={()=>setValue('ugc')} aria-label={`Review ${ugcCount} pending links`}><div><strong>{ugcCount.toLocaleString()}</strong><span>Links awaiting review</span></div><ArrowUpRight aria-hidden="true" size={22}/></button>
      <button type="button" className={`${surface.surface} ${styles.reviewCard}`} onClick={()=>setValue('claims')} aria-label={`Review ${claimsCount} pending claims`}><div><strong>{claimsCount.toLocaleString()}</strong><span>Artist claims awaiting review</span></div><ArrowUpRight aria-hidden="true" size={22}/></button>
    </div>
    <div className={styles.workspace}>
      <div className={styles.mobileSections}>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger aria-label="Admin section" className={styles.sectionTrigger}>
            <span className={styles.sectionOption}><currentSection.icon size={18} aria-hidden="true"/><span>{currentSection.label}</span>{currentSection.count !== undefined && <span className={styles.badge}>{currentSection.count}</span>}</span>
          </SelectTrigger>
          <SelectContent className={styles.sectionMenu}>
            {sections.map(section => <SelectItem key={section.value} value={section.value} textValue={section.label} className={styles.sectionItem}>
              <span className={styles.sectionOption}><section.icon size={18} aria-hidden="true"/><span>{section.label}</span>{section.count !== undefined && <span className={styles.badge}>{section.count}</span>}</span>
            </SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <TabsList aria-label="Admin sections" className={styles.tabs}>{sections.map(section=><TabsTrigger className={styles.tab} key={section.value} value={section.value}><section.icon size={16} aria-hidden="true"/><span>{section.label}</span>{section.count!==undefined && <span className={styles.badge}>{section.count}</span>}</TabsTrigger>)}</TabsList>
      <div className="min-w-0">{sections.map(section=><TabsContent className={styles.panel} key={section.value} value={section.value}><header className={styles.panelHeader}><h2>{section.title}</h2><p>{section.description}</p></header>{section.content}</TabsContent>)}</div>
    </div>
  </Tabs>;
}
