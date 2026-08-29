"use client";

import { useMemo, useState } from "react";
import { Plus, Search, BedDouble, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomCard } from "./room-card";
import { RoomTypesList } from "./room-types-list";
import {
  RoomFormDialog,
  type RoomData,
} from "./room-form-dialog";
import {
  RoomTypeFormDialog,
  type RoomTypeData,
} from "./room-type-form-dialog";
import {
  ROOM_STATUS_LABELS,
  ROOM_STATUSES,
  type RoomStatus,
} from "@/lib/validations/room";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | RoomStatus;

export function RoomsView({
  rooms,
  roomTypes,
  canManage,
  canManageStatus,
}: {
  rooms: RoomData[];
  roomTypes: RoomTypeData[];
  canManage: boolean;
  canManageStatus: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"rooms" | "types">("rooms");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomData | null>(null);

  const [roomTypeDialogOpen, setRoomTypeDialogOpen] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomTypeData | null>(null);

  // Map roomTypeId to RoomTypeData
  const roomTypeMap = useMemo(() => {
    const map = new Map<string, RoomTypeData>();
    for (const rt of roomTypes) map.set(rt.id, rt);
    return map;
  }, [roomTypes]);

  // Count rooms by status
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: rooms.length,
      available: 0,
      reserved: 0,
      occupied: 0,
      housekeeping: 0,
    };
    for (const r of rooms) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return counts;
  }, [rooms]);

  // Count rooms by room type
  const roomCountsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rooms) {
      counts[r.roomTypeId] = (counts[r.roomTypeId] ?? 0) + 1;
    }
    return counts;
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesStatus =
        statusFilter === "all" ? true : r.status === statusFilter;
      const rt = roomTypeMap.get(r.roomTypeId);
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        r.roomNumber.toLowerCase().includes(query) ||
        (r.floor && r.floor.toLowerCase().includes(query)) ||
        (rt && rt.name.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [rooms, statusFilter, searchQuery, roomTypeMap]);

  function handleOpenAddRoom() {
    setEditingRoom(null);
    setRoomDialogOpen(true);
  }

  function handleEditRoom(room: RoomData) {
    setEditingRoom(room);
    setRoomDialogOpen(true);
  }

  function handleOpenAddRoomType() {
    setEditingRoomType(null);
    setRoomTypeDialogOpen(true);
  }

  function handleEditRoomType(rt: RoomTypeData) {
    setEditingRoomType(rt);
    setRoomTypeDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Top action bar & tab switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canManage ? (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "rooms" | "types")}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="rooms">
                <BedDouble className="size-4" />
                Rooms ({rooms.length})
              </TabsTrigger>
              <TabsTrigger value="types">
                <Layers className="size-4" />
                Room Types ({roomTypes.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <div className="text-sm font-medium text-muted-foreground">
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"} in inventory
          </div>
        )}

        {canManage && (
          <div className="flex items-center gap-2">
            {activeTab === "rooms" ? (
              <Button
                size="sm"
                onClick={handleOpenAddRoom}
                disabled={roomTypes.length === 0}
              >
                <Plus data-icon="inline-start" />
                Add Room
              </Button>
            ) : (
              <Button size="sm" onClick={handleOpenAddRoomType}>
                <Plus data-icon="inline-start" />
                Add Room Type
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ROOMS TAB CONTENT */}
      {activeTab === "rooms" && (
        <div className="space-y-3">
          {/* If no room types exist yet, prompt to create room type first */}
          {roomTypes.length === 0 && canManage ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Layers className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                Define Room Types first
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Before adding physical rooms, create category classifications
                (e.g., Deluxe, Standard, Suite).
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  setActiveTab("types");
                  handleOpenAddRoomType();
                }}
              >
                <Plus data-icon="inline-start" />
                Create Room Type
              </Button>
            </div>
          ) : (
            <>
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search room number or type…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Status filter scrollable pill row */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    statusFilter === "all"
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  All
                  <span className="opacity-70">({statusCounts.all})</span>
                </button>

                {ROOM_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      statusFilter === st
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {ROOM_STATUS_LABELS[st]}
                    <span className="opacity-70">({statusCounts[st]})</span>
                  </button>
                ))}
              </div>

              {/* Rooms list */}
              {filteredRooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                  {rooms.length === 0
                    ? "No rooms added yet."
                    : "No rooms match the selected filter."}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filteredRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      roomType={roomTypeMap.get(room.roomTypeId)}
                      canManageRooms={canManage}
                      canManageStatus={canManageStatus}
                      onEdit={handleEditRoom}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ROOM TYPES TAB CONTENT */}
      {activeTab === "types" && canManage && (
        <RoomTypesList
          roomTypes={roomTypes}
          roomCountsByType={roomCountsByType}
          canManage={canManage}
          onEdit={handleEditRoomType}
        />
      )}

      {/* Modals */}
      <RoomFormDialog
        open={roomDialogOpen}
        onOpenChange={setRoomDialogOpen}
        roomTypes={roomTypes}
        editingRoom={editingRoom}
      />

      <RoomTypeFormDialog
        open={roomTypeDialogOpen}
        onOpenChange={setRoomTypeDialogOpen}
        editingRoomType={editingRoomType}
      />
    </div>
  );
}
