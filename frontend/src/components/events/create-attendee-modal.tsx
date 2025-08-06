import { X, User, Mail, Clock, UserCheck } from "lucide-react";
import { ATTENDEE_STATUS } from "@/schema/enums/attendee-status";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateAttendeeSchema } from "@/schema/events/create-attendee.schema";
import { useForm } from "react-hook-form";
import { TicketType } from "@/schema";
import { Button } from "../ui/button";
import { formatCurrency } from "@/lib/utils";

interface CreateAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  eventID: string;
  eventName: string;
  ticketTypes: TicketType[];
}

const CreateAttendeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  eventID,
  eventName,
  ticketTypes,
}: CreateAttendeeModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(CreateAttendeeSchema),
    defaultValues: {
      purchaseID: "",
      ticketTypeID: "",
      eventID: eventID,
      assignedUserID: "",
      displayName: "",
      email: "",
      attendeeStatus: ATTENDEE_STATUS.REGISTERED,
      checkInTime: null,
      updatedAt: "",
      quantity: 1,
    },
    mode: "onBlur",
  });

  // const { fields, append, remove } = useFieldArray({
  //   control,
  //   name: "attendees",
  // });

  const handleFormSubmit = async (data) => {
    try {
      const submitData = {
        ...data,
        joinedAt: data.joinedAt ? new Date(data.joinedAt).toISOString() : null,
        checkInTime: data.checkInTime
          ? new Date(data.checkInTime).toISOString()
          : null,
        updatedAt: data.updatedAt
          ? new Date(data.updatedAt).toISOString()
          : undefined,
        qrCodeUrl: data.qrCodeUrl || undefined,
      };
      await onSubmit(submitData);
      onClose();
      reset();
    } catch (error) {
      console.error("Error creating attendee:", error);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 16);
    } catch (e) {
      return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Create New Attendee
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-6 space-y-6"
        >
          {/* Purchase & Event Info */}
          <div className="flex gap-4 items-start">
            {/* Ticket Type */}
            <div className="w-3/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ticket Type *
              </label>
              <select
                {...register("ticketTypeID")}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ticketTypeID ? "border-red-300" : "border-gray-300"
                }`}
              >
                <option value="">-- Select a Ticket Type --</option>
                {ticketTypes.map((ticket) => (
                  <option key={ticket.ticketTypeID} value={ticket.ticketTypeID}>
                    {ticket.name} (Price: {formatCurrency(ticket.price)}
                    {ticket.currency})
                  </option>
                ))}
              </select>
              {errors.ticketTypeID && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.ticketTypeID.message}
                </p>
              )}
            </div>

            {/* Quantity (disabled) */}
            <div className="w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="text"
                disabled
                {...register("quantity")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event ID *
            </label>
            <input
              type="text"
              value={eventID}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>

          {/* Attendee Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <User className="h-4 w-4" />
                Display Name *
              </label>
              <input
                type="text"
                {...register("displayName")}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.displayName ? "border-red-300" : "border-gray-300"}`}
                placeholder="Enter display name"
                maxLength={100}
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email *
              </label>
              <input
                type="email"
                {...register("email")}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? "border-red-300" : "border-gray-300"}`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Status and Check-in */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendee Status
            </label>
            <select
              {...register("attendeeStatus")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={ATTENDEE_STATUS.REGISTERED}>Registered</option>
              <option value={ATTENDEE_STATUS.CHECKED_IN}>Checked In</option>
              <option value={ATTENDEE_STATUS.CANCELLED}>Cancelled</option>
            </select>
          </div>
          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <Button
              loading={isSubmitting}
              type="submit"
              disabled={
                isSubmitting || !isDirty || Object.values(errors).length > 0
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Attendee"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAttendeeModal;
