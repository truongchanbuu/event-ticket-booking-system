import {
  CreateEventFormSchema,
  CreateEventFormValues,
} from "@/schema/events/event-creation.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export function useEventCreationForm() {
  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(CreateEventFormSchema),
    shouldUnregister: false,
    defaultValues: {
      title: "",
      description: "",
      images: [],
      location: { address: "" },
      categories: [],
      startTime: "",
      endTime: "",
      isFeatured: false,
      ticketTypes: [],
    },
    mode: "onBlur",
  });

  return form;
}
