import React, { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit2, Trash2, X, Loader2, TrendingUp } from "lucide-react";
import { TicketFormData, TicketFormSchema, TicketType } from "@/schema";
import { ProgressBar } from "../ui/progress-bar";
import { Button } from "../ui/button";
import { PriceField } from "../ui/price-form-field";
import { CurrencySelect } from "../ui/currency-form-select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import LoadingSpinner from "../ui/loading";
import { formatCurrency } from "@/lib/utils";
import { ConfirmDeleteModal } from "../ui/confirm-dialog";
import { ErrorMessage } from "../ui/error-ui-with-reload";

const TicketRow = ({ ticket, onEdit, onDelete }) => {
  const canUpdateTicket =
    ticket.publishedAt && ticket.totalQuantity !== ticket.remainingQuantity;
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div
          className="text-sm font-medium text-gray-900 truncate"
          title={ticket.name}
        >
          {ticket.name}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {typeof ticket.price === "number" ? ticket.price.toFixed(2) : "0.00"}{" "}
          {ticket.currency || ""}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{ticket.totalQuantity}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {(ticket.totalQuantity ?? 0) - (ticket.remainingQuantity ?? 0)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{ticket.checkInQuantity}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-24">
          <ProgressBar
            current={ticket.remainingQuantity}
            total={ticket.totalQuantity}
          />
          <div className="text-xs text-gray-500 mt-1">
            {ticket.totalQuantity > 0
              ? `${Math.round(
                  (((ticket.totalQuantity ?? 0) -
                    (ticket.remainingQuantity ?? 0)) /
                    (ticket.totalQuantity ?? 1)) *
                    100
                )}%`
              : "0%"}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-green-600">
          {formatCurrency(
            (ticket.price ?? 0) *
              ((ticket.totalQuantity ?? 0) - (ticket.remainingQuantity ?? 0))
          )}
        </div>
      </td>
      <td
        title={
          canUpdateTicket ? "You cannot update ticket when it has sold." : ""
        }
        className="px-6 py-4 whitespace-nowrap text-sm font-medium"
      >
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            title={
              canUpdateTicket
                ? "You cannot update a published ticket type"
                : "Edit"
            }
            disabled={canUpdateTicket}
            onClick={() => onEdit(ticket)}
            className="text-blue-600 hover:text-blue-900 transition-colors hover:bg-gray-50"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            title={
              canUpdateTicket
                ? "You cannot update a published ticket type"
                : "Edit"
            }
            disabled={canUpdateTicket}
            onClick={() => onDelete(ticket.ticketTypeID)}
            className="text-red-600 hover:text-red-900 transition-colors hover:bg-gray-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
const TicketModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingTicket,
  isLoading,
  methods,
}) => {
  if (!isOpen) return null;

  const {
    register,
    formState: { errors },
  } = methods;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md mx-4 sm:px-6 py-6 bg-white rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingTicket ? "Edit Ticket Type" : "Create New Ticket Type"}
          </h2>
          <Button
            variant="link"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">
              Ticket Name *
            </Label>
            <Input
              {...register("name")}
              type="text"
              placeholder="Enter ticket name"
              className="w-full"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
          <PriceField />
          <CurrencySelect />
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">
              Total Quantity *
            </Label>
            <Input
              {...register("totalQuantity", {
                valueAsNumber: true,
                validate: (value) => {
                  if (
                    editingTicket &&
                    value <
                      (editingTicket?.totalQuantity ?? 0) -
                        (editingTicket?.remainingQuantity ?? 0)
                  ) {
                    return `Cannot be less than sold quantity (${
                      (editingTicket?.totalQuantity ?? 0) -
                      (editingTicket?.remainingQuantity ?? 0)
                    })`;
                  }
                  return true;
                },
              })}
              type="number"
              min={
                editingTicket
                  ? editingTicket.totalQuantity -
                    editingTicket.remainingQuantity
                  : 0
              }
              placeholder="0"
              className="w-full"
            />
            {errors.totalQuantity && (
              <p className="text-red-500 text-sm mt-1">
                {errors.totalQuantity.message}
              </p>
            )}
            {editingTicket && (
              <p className="text-gray-500 text-xs mt-1">
                Minimum:{" "}
                {editingTicket.totalQuantity - editingTicket.remainingQuantity}{" "}
                (already sold)
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-5">
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading}
              onClick={onClose}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={isLoading}
              loading={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingTicket ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
    <div className="text-gray-500">
      No ticket types found. Create your first ticket type to get started.
    </div>
  </div>
);

interface TicketManagementProps {
  isPublished?: boolean;
  tickets: TicketType[];
  isLoading: boolean;
  error: string | null | undefined;
  onCreate: (data: TicketFormData) => Promise<void>;
  onUpdate: (ticketTypeID: string, data: any) => Promise<void>;
  onDelete: (ticketTypeID: string) => Promise<void>;
  refetch: any;
}

const TicketManagement = ({
  tickets,
  isPublished = false,
  isLoading = false,
  error,
  onCreate,
  onUpdate,
  onDelete,
  refetch,
}: TicketManagementProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    confirm: boolean;
    ticketTypeID?: string;
  }>({
    confirm: false,
    ticketTypeID: undefined,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm({
    resolver: zodResolver(TicketFormSchema),
    defaultValues: editingTicket ?? {
      name: "",
      price: 0,
      currency: "VND",
      totalQuantity: 1,
    },
  });

  const { handleSubmit, reset, clearErrors, formState } = methods;

  const openCreateModal = () => {
    clearErrors();
    setEditingTicket(null);
    reset({
      name: "",
      price: 0,
      currency: "VND",
      totalQuantity: 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ticket) => {
    setEditingTicket(ticket);
    reset({
      name: ticket.name,
      price: ticket.price,
      currency: ticket.currency,
      totalQuantity: ticket.totalQuantity,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTicket(null);
    clearErrors();
    reset();
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingTicket) {
        const changedFields = Object.entries(formState.dirtyFields).reduce(
          (result, [key, isDirty]) => {
            if (isDirty && data[key] !== editingTicket[key]) {
              result[key] = data[key];
            }
            return result;
          },
          {}
        );

        if (Object.keys(changedFields).length === 0) {
          console.log("No fields changed");
          closeModal();
          return;
        }

        await onUpdate(editingTicket.ticketTypeID, changedFields);
      } else {
        await onCreate(data);
      }
      closeModal();
    } catch (err) {
      console.error("Failed to submit:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTicket = async (ticketTypeID) => {
    setIsSubmitting(true);
    try {
      await onDelete(ticketTypeID);
    } catch (err) {
      console.error("Failed to delete:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onReload={refetch} />;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Ticket Types</h1>
            {!isPublished && (
              <Button
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create New Ticket Type
              </Button>
            )}
          </div>

          {tickets.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="text-lg font-semibold text-gray-900">
                  Ticket Types
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your event tickets and track performance
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Ticket Details
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Sales Progress
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Check-in Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {tickets.map((ticket) => (
                      <TicketRow
                        key={ticket.ticketTypeID}
                        ticket={ticket}
                        onEdit={openEditModal}
                        onDelete={() =>
                          setShowDeleteConfirm({
                            confirm: true,
                            ticketTypeID: ticket.ticketTypeID,
                          })
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}

          <TicketModal
            isOpen={isModalOpen}
            onClose={closeModal}
            onSubmit={handleSubmit(onSubmit)}
            editingTicket={editingTicket}
            isLoading={isLoading || isSubmitting}
            methods={methods}
          />
        </div>

        {/* Delete Modal */}
        <ConfirmDeleteModal
          onCancel={() =>
            setShowDeleteConfirm({ confirm: false, ticketTypeID: undefined })
          }
          open={showDeleteConfirm.confirm}
          onConfirm={async () => {
            if (showDeleteConfirm.ticketTypeID) {
              await deleteTicket(showDeleteConfirm.ticketTypeID);
            }
          }}
          title="Delete Ticket Type"
          description="Do you want to delete this ticket type?"
        />
      </form>
    </FormProvider>
  );
};

export default TicketManagement;
