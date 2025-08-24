"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";

interface UserEntry {
  id: string;
  createdAt: string | null;
  artistName: string | null;
  siteName: string | null;
  ugcUrl: string | null;
  accepted: boolean | null;
}

type ApiResponse = {
  entries: UserEntry[];
  total: number;
  pageCount: number;
};

const PER_PAGE = 10;

const parseUTC = (s: string): Date => {
  // If string already has timezone info (Z or +/-), keep as is; else assume UTC by appending Z
  return new Date(/Z|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`);
};

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const date = parseUTC(iso);
  return date.toLocaleDateString();
};

const formatTime = (iso: string | null) => {
  if (!iso) return "";
  const date = parseUTC(iso);
  return date
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s([AP]M)$/i, "\u00A0$1");
};

export default function UserEntriesTable() {
  const [entries, setEntries] = useState<UserEntry[]>([]);
  /** Keeps track of which page numbers have been fetched already */
  const fetchedPages = useRef<Set<number>>(new Set());
  /** Current page displayed by the table */
  const [page, setPage] = useState(1);
  /** Total number of pages available according to the server */
  const [pageCount, setPageCount] = useState(1);
  /** Total number of entries (for information only) */
  const [total, setTotal] = useState(0);
  /** Currently selected site filter */
  const [filter, setFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [artistQuery, setArtistQuery] = useState("");
  const [statusSort, setStatusSort] = useState<"default" | "approved" | "pending">("default");
  const [loading, setLoading] = useState(false);

  const artistInputRef = useRef<HTMLInputElement>(null);

  /**
   * Fetches a page of entries from the server and merges them into the existing list.
   * If the page has already been fetched, this function does nothing.
   */
  const fetchPage = async (pageToFetch: number) => {
    // Skip if we've already fetched this page
    if (fetchedPages.current.has(pageToFetch)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/userEntries?page=${pageToFetch}`);
      if (!res.ok) return;
      const data: ApiResponse = await res.json();
      fetchedPages.current.add(pageToFetch);
      // Merge new entries, avoiding duplicates
      setEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const entriesArray = Array.isArray(data.entries) ? data.entries : [];
        const merged = [...prev, ...entriesArray.filter((e) => !existingIds.has(e.id))];
        return merged;
      });
      setTotal(data.total);
      setPageCount(data.pageCount);
    } catch (e) {
      console.error("[UserEntriesTable] failed to fetch entries", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch first page on mount
  useEffect(() => {
    fetchPage(1);
  }, []);

  // Fetch new page when page changes
  useEffect(() => {
    fetchPage(page);
  }, [page]);

  // Reset pagination when filter changes
  useEffect(() => {
    const fetchFiltered = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/userEntries?filter=${filter}`);
        if (!res.ok) return;
        const data: ApiResponse = await res.json();
        // Replace existing entries with filtered result
        const entriesArray = Array.isArray(data.entries) ? data.entries : [];
        setEntries(entriesArray);
        setPage(1);
        setPageCount(1);
      } catch (e) {
        console.error("[UserEntriesTable] failed to fetch filtered entries", e);
      } finally {
        setLoading(false);
      }
    }
    fetchFiltered();
  }, [filter]);

  const processed = useMemo(() => {
    let arr = [...entries];
    // filter by entry type
    if (filter !== "all") arr = arr.filter((e) => e.siteName === filter);
    // filter by artist query
    if (artistQuery.trim()) {
      const q = artistQuery.toLowerCase();
      arr = arr.filter((e) => (e.artistName ?? "").toLowerCase().includes(q));
    }
    // sort by full timestamp (most recent first / oldest depending on sortOrder)
    arr.sort((a, b) => {
      const tA = parseUTC(a.createdAt ?? "").getTime();
      const tB = parseUTC(b.createdAt ?? "").getTime();
      return sortOrder === "asc" ? tA - tB : tB - tA;
    });

    if (statusSort !== "default") {
      arr.sort((a, b) => {
        const aApproved = !!a.accepted;
        const bApproved = !!b.accepted;
        if (statusSort === "approved") {
          // approved first
          return aApproved === bApproved ? 0 : aApproved ? -1 : 1;
        } else {
          // pending first
          return aApproved === bApproved ? 0 : aApproved ? 1 : -1;
        }
      });
    }
    return arr;
  }, [entries, filter, sortOrder, artistQuery, statusSort]);

  return (
    <div className="max-w-3xl mx-auto mt-10">
      {/* Title above the table */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-semibold text-[#c6bfc7] outline-none">Your Artist Data Entry</h2>
      </div>
      
      <Card className="border-2 border-[#9b83a0] shadow-none max-w-[720px] lg:max-w-none">
        {/* Mobile: Single scrollable container for header and table */}
                                   <div className="overflow-x-auto w-full">
                                         <div className="min-w-[720px] max-w-[720px] sm:max-w-none">
                      {/* Table Header */}
            <div className="bg-[#6f4b75] p-0 rounded-t-md border-b-2 border-[#9b83a0] min-w-full sticky top-0 z-10">
                         <div className="grid grid-cols-[80px_80px_180px_200px_80px_80px] sm:grid-cols-[100px_100px_150px_200px_100px_120px] lg:grid-cols-[1fr_1fr_2fr_2.5fr_0.8fr_1.2fr] text-white w-full">
              <div
                className="text-center cursor-pointer select-none py-3 px-1 sm:px-3 border-l border-t border-[#c6bfc7] rounded-tl-md flex items-center justify-center"
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
              >
                                 <div className="flex items-center justify-center gap-1">
                   <span className="whitespace-nowrap text-xs sm:text-base">Date</span>
                   <ArrowUpDown
                     className={`w-2 h-2 sm:w-3 sm:h-3 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                   />
                 </div>
              </div>
                             <div className="text-center py-3 px-1 sm:px-3 border-t border-[#c6bfc7] flex items-center justify-center">
                 <span className="whitespace-nowrap text-xs sm:text-base">Time</span>
               </div>
                             <div className="text-center py-3 px-2 sm:px-3 border-t border-[#c6bfc7]">
                 <div className="flex items-center justify-center gap-1 w-full">
                   <span className="whitespace-nowrap text-xs sm:text-base">Artist</span>
                   <div
                     className="relative flex items-center cursor-text"
                     onClick={() => artistInputRef.current?.focus()}
                   >
                                           <Input
                        value={artistQuery}
                        onChange={(e) => setArtistQuery(e.target.value)}
                        placeholder="Search"
                        ref={artistInputRef}
                        className="h-6 pr-6 pl-2 py-1 text-xs w-16 sm:h-6 sm:pr-6 sm:pl-2 sm:w-full bg-white border border-gray-300 text-black dark:text-white focus:outline-none focus:ring-0 focus:border-gray-300"
                      />
                     <SearchIcon className="absolute right-1 h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-500" strokeWidth={2} />
                   </div>
                 </div>
               </div>
                             <div className="text-center py-3 px-2 sm:px-3 border-t border-[#c6bfc7] flex items-center justify-center">
                 <div className="flex items-center justify-center gap-1 w-full">
                   <span className="whitespace-nowrap text-xs sm:text-base">Entry Type</span>
                   <select
                     value={filter}
                     onChange={(e) => setFilter(e.target.value)}
                     className="border border-gray-300 rounded-md py-1 px-2 text-xs h-6 w-18 sm:h-6 sm:w-full text-black dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-0 focus:border-gray-300"
                   >
                    <option value="all">All</option>
                    {Array.from(new Set(entries.map((e) => e.siteName).filter(Boolean))).map((site) => (
                      <option key={site as string} value={site as string}>
                        {site as string}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
                             <div className="text-center py-3 px-1 sm:px-3 border-t border-[#c6bfc7] flex items-center justify-center">
                 <span className="whitespace-nowrap text-xs sm:text-base">Site Link</span>
               </div>
                             <div
                 className="text-center py-3 px-1 sm:px-3 cursor-pointer select-none border-t border-r border-[#c6bfc7] rounded-tr-md flex items-center justify-center"
                 onClick={() =>
                   setStatusSort((prev) =>
                     prev === "default" ? "approved" : prev === "approved" ? "pending" : "default"
                   )
                 }
               >
                 <div className="flex items-center justify-center gap-1">
                   <span className="whitespace-nowrap text-xs sm:text-base">Status</span>
                   {statusSort === "approved" ? (
                     <ArrowUp className="w-2 h-2 sm:w-3 sm:h-3" />
                   ) : statusSort === "pending" ? (
                     <ArrowDown className="w-2 h-2 sm:w-3 sm:h-3" />
                   ) : (
                     <ArrowUpDown className="w-2 h-2 sm:w-3 sm:h-3" />
                   )}
                 </div>
               </div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="p-0 border-b-2 border-[#9b83a0] min-w-full">
            {loading ? (
              <div className="bg-white border-b border-[#c6bfc7] py-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#c6bfc7] border-t-transparent"></div>
                  <span>Loading...</span>
                </div>
              </div>
            ) : processed.length ? (
              (() => {
                let lastArtist: string | null = null;
                const pageStart = (page - 1) * PER_PAGE;
                const pageEnd = pageStart + PER_PAGE;
                return processed.slice(pageStart, pageEnd).map((entry) => {
                  const displayArtist = entry.artistName ?? lastArtist ?? "—";
                  if (entry.artistName) lastArtist = entry.artistName;
                  return (
                                         <div key={entry.id} className="grid grid-cols-[80px_80px_180px_200px_80px_80px] sm:grid-cols-[100px_100px_150px_200px_100px_120px] lg:grid-cols-[1fr_1fr_2fr_2.5fr_0.8fr_1.2fr] bg-white hover:bg-white border-b border-[#9b83a0] w-full">
                      <div className="text-center px-1 sm:px-3 py-2 border-l border-[#c6bfc7] text-xs sm:text-sm">{formatDate(entry.createdAt)}</div>
                      <div className="text-center px-1 sm:px-3 py-2 border-l border-[#c6bfc7] text-xs sm:text-sm">{formatTime(entry.createdAt)}</div>
                      <div className="text-center px-1 sm:px-3 py-2 border-l border-[#c6bfc7] text-xs sm:text-sm">{displayArtist}</div>
                      <div className="text-center px-1 sm:px-3 py-2 border-l border-[#c6bfc7] text-xs sm:text-sm">{entry.siteName ?? "—"}</div>
                      <div className="text-center px-1 sm:px-3 py-2 border-l border-[#c6bfc7] text-xs sm:text-sm">
                        {entry.ugcUrl ? (
                          <Link
                            className="text-blue-600 underline"
                            href={entry.ugcUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </Link>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div
                        className={`text-center px-1 sm:px-3 py-2 border-l border-r border-[#c6bfc7] font-semibold text-xs sm:text-sm ${entry.accepted ? "text-green-600" : "text-yellow-600"}`}
                      >
                        {entry.accepted ? "Approved" : "Pending"}
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="bg-white border-b border-[#9b83a0] py-4">
                <div className="text-center">No entries</div>
              </div>
            )}
                    </div>
          </div>
        </div>
        {pageCount > 1 && (
          <CardFooter className="bg-[#6f4b75] border border-[#6f4b75] rounded-b-md flex justify-end items-center gap-4 p-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="bg-white text-[#6f4b75] border-white hover:bg-gray-100 hover:text-[#6f4b75]"
            >
              Prev
            </Button>
            <span className="text-sm text-white">Page {page} of {pageCount}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="bg-white text-[#6f4b75] border-white hover:bg-gray-100 hover:text-[#6f4b75]"
            >
              Next
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 