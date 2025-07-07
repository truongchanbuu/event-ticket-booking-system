"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  X,
  Edit,
  Trash2,
  Loader2,
  Ticket,
  DollarSign,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createTicketTypeAPI,
  updateTicketTypeAPI,
  deleteTicketTypeAPI,
} from "@/lib/api";
import type { EventType } from "@/schema";
import { useAuth } from "@/app/providers/AuthProvider";

interface TicketManagementModalProps {
  open: boolean;
  onClose: () => void;
  event: EventType | null;
  onSuccess: () => void;
}

interface TicketType {
  id?: string;
  name: string;
  price: number;
  maxPerPerson: number;
  remaining: number;
  description: string;
  serviceFee?: number;
}

export default function TicketManagementModal({
  open,
  onClose,
  event,
  onSuccess,
}: TicketManagementModalProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTicket, setNewTicket] = useState<TicketType>({
    name: "",
    price: 0,
    maxPerPerson: 1,
    remaining: 0,
    description: "",
    serviceFee: 0,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Initialize ticket types when event changes
  useEffect(() => {
    if (event) {
      setTicketTypes(
        event.ticketTypes.map((ticket) => ({
          id: ticket.typeID,
          name: ticket.name,
          price: ticket.price,
          maxPerPerson: ticket.maxPerPerson,
          remaining: ticket.remaining,
          description: ticket.description,
          serviceFee: ticket.serviceFee,
        }))
      );
    }
  }, [event]);

  const createTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user || !event)
        throw new Error("User not authenticated or event not found");
      const token = await user.getIdToken();
      return createTicketTypeAPI(event.eventID, data, token);
    },
    onSuccess: () => {
      toast({ title: "Ticket type created successfully!", variant: "success" });
      onSuccess();
      setShowAddForm(false);
      setNewTicket({
        name: "",
        price: 0,
        maxPerPerson: 1,
        remaining: 0,
        description: "",
        serviceFee: 0,
      });
    },
    onError: () => {
      toast({ title: "Failed to create ticket type", variant: "destructive" });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error("User not authenticated");
      const token = await user.getIdToken();
      return updateTicketTypeAPI(editingTicket?.id || "", data, token);
    },
    onSuccess: () => {
      toast({ title: "Ticket type updated successfully!", variant: "success" });
      onSuccess();
      setEditingTicket(null);
    },
    onError: () => {
      toast({ title: "Failed to update ticket type", variant: "destructive" });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!user) throw new Error("User not authenticated");
      const token = await user.getIdToken();
      return deleteTicketTypeAPI(ticketId, token);
    },
    onSuccess: () => {
      toast({ title: "Ticket type deleted successfully!", variant: "success" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to delete ticket type", variant: "destructive" });
    },
  });

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTicket.name || newTicket.price < 0 || newTicket.maxPerPerson < 1) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    await createTicketMutation.mutateAsync(newTicket);
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !editingTicket ||
      !editingTicket.name ||
      editingTicket.price < 0 ||
      editingTicket.maxPerPerson < 1
    ) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    await updateTicketMutation.mutateAsync(editingTicket);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    await deleteTicketMutation.mutateAsync(ticketId);
  };

  const getTotalRevenue = () => {
    return ticketTypes.reduce((total, ticket) => {
      const sold = ticket.maxPerPerson - ticket.remaining;
      return total + Math.max(0, sold) * ticket.price;
    }, 0);
  };

  const getTotalTicketsSold = () => {
    return ticketTypes.reduce((total, ticket) => {
      const sold = ticket.maxPerPerson - ticket.remaining;
      return total + Math.max(0, sold);
    }, 0);
  };

  const getTotalTicketsAvailable = () => {
    return ticketTypes.reduce(
      (total, ticket) => total + ticket.maxPerPerson,
      0
    );
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Tickets - {event.eventTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Ticket className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total Available</p>
                    <p className="text-2xl font-bold">
                      {getTotalTicketsAvailable()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Tickets Sold</p>
                    <p className="text-2xl font-bold">
                      {getTotalTicketsSold()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">${getTotalRevenue()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add New Ticket Type */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Ticket Type</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showAddForm ? "Cancel" : "Add Ticket"}
                </Button>
              </div>
            </CardHeader>

            {showAddForm && (
              <CardContent>
                <form onSubmit={handleAddTicket} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newTicketName">Ticket Type *</Label>
                      <Input
                        id="newTicketName"
                        value={newTicket.name}
                        onChange={(e) =>
                          setNewTicket((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="e.g., General Admission, VIP"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="newTicketPrice">Price *</Label>
                      <Input
                        id="newTicketPrice"
                        type="number"
                        value={newTicket.price}
                        onChange={(e) =>
                          setNewTicket((prev) => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="newTicketMaxPerPerson">
                        Max Per Person *
                      </Label>
                      <Input
                        id="newTicketMaxPerPerson"
                        type="number"
                        value={newTicket.maxPerPerson}
                        onChange={(e) =>
                          setNewTicket((prev) => ({
                            ...prev,
                            maxPerPerson: parseInt(e.target.value) || 1,
                          }))
                        }
                        placeholder="1"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="newTicketServiceFee">Service Fee</Label>
                      <Input
                        id="newTicketServiceFee"
                        type="number"
                        value={newTicket.serviceFee || 0}
                        onChange={(e) =>
                          setNewTicket((prev) => ({
                            ...prev,
                            serviceFee: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="newTicketDescription">Description</Label>
                      <Input
                        id="newTicketDescription"
                        value={newTicket.description}
                        onChange={(e) =>
                          setNewTicket((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Describe this ticket type"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTicketMutation.isPending}
                    >
                      {createTicketMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create Ticket Type
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Existing Ticket Types */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Ticket Types</CardTitle>
            </CardHeader>
            <CardContent>
              {ticketTypes.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No ticket types
                  </h3>
                  <p className="text-gray-600">
                    Create your first ticket type to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticketTypes.map((ticket, index) => (
                    <div
                      key={ticket.id || index}
                      className="border rounded-lg p-4"
                    >
                      {editingTicket?.id === ticket.id ? (
                        // Edit Form
                        <form
                          onSubmit={handleUpdateTicket}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Ticket Type *</Label>
                              <Input
                                value={editingTicket.name}
                                onChange={(e) =>
                                  setEditingTicket((prev) =>
                                    prev
                                      ? { ...prev, name: e.target.value }
                                      : null
                                  )
                                }
                                required
                              />
                            </div>

                            <div>
                              <Label>Price *</Label>
                              <Input
                                type="number"
                                value={editingTicket.price}
                                onChange={(e) =>
                                  setEditingTicket((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          price:
                                            parseFloat(e.target.value) || 0,
                                        }
                                      : null
                                  )
                                }
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>

                            <div>
                              <Label>Max Per Person *</Label>
                              <Input
                                type="number"
                                value={editingTicket.maxPerPerson}
                                onChange={(e) =>
                                  setEditingTicket((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          maxPerPerson:
                                            parseInt(e.target.value) || 1,
                                        }
                                      : null
                                  )
                                }
                                min="1"
                                required
                              />
                            </div>

                            <div>
                              <Label>Service Fee</Label>
                              <Input
                                type="number"
                                value={editingTicket.serviceFee || 0}
                                onChange={(e) =>
                                  setEditingTicket((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          serviceFee:
                                            parseFloat(e.target.value) || 0,
                                        }
                                      : null
                                  )
                                }
                                min="0"
                                step="0.01"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label>Description</Label>
                              <Input
                                value={editingTicket.description}
                                onChange={(e) =>
                                  setEditingTicket((prev) =>
                                    prev
                                      ? { ...prev, description: e.target.value }
                                      : null
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingTicket(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={updateTicketMutation.isPending}
                            >
                              {updateTicketMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Update
                            </Button>
                          </div>
                        </form>
                      ) : (
                        // Display Mode
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {ticket.name}
                                </h4>
                                {ticket.description && (
                                  <p className="text-sm text-gray-600">
                                    {ticket.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-4 text-sm">
                                <div>
                                  <span className="font-medium">Price:</span> $
                                  {ticket.price}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Available:
                                  </span>{" "}
                                  {ticket.remaining}
                                </div>
                                <div>
                                  <span className="font-medium">Sold:</span>{" "}
                                  {ticket.maxPerPerson - ticket.remaining}
                                </div>
                                <div>
                                  <span className="font-medium">Revenue:</span>{" "}
                                  $
                                  {(ticket.maxPerPerson - ticket.remaining) *
                                    ticket.price}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTicket(ticket)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Ticket Type
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this ticket
                                    type? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      ticket.id && handleDeleteTicket(ticket.id)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
