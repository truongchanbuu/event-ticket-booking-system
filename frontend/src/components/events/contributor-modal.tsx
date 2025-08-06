import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { User, Star } from "lucide-react";
import { EventContributor, EventContributorSchema } from "@/schema";
import { useEventContributor } from "@/hooks/use-event-contributor";
import { EventManagementService } from "@/services/event-management.service";
import { useUserProfile } from "@/hooks/user-store-hooks";
import { useEffect, useState } from "react";
import { PhotoUploader } from "../ui/photo-uploader";

interface ContributorFormProps {
  eventID: string;
  isOpen: boolean;
  onClose: () => void;
  contributor?: EventContributor;
}

export const ContributorModal = ({
  eventID,
  isOpen,
  onClose,
  contributor,
}: ContributorFormProps) => {
  const userProfile = useUserProfile();
  const { createContributor, isCreating, updateContributor, isUpdating } =
    useEventContributor();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMutating = isSubmitting || isCreating || isUpdating;

  const form = useForm<EventContributor>({
    resolver: zodResolver(EventContributorSchema),
    defaultValues: {
      fullname: contributor?.fullname || "",
      role: contributor?.role || "",
      isHeadliner: contributor?.isHeadliner || false,
      photo: undefined,
    },
  });

  const { reset } = form;
  useEffect(() => {
    if (isOpen) {
      if (contributor) {
        reset({
          fullname: contributor.fullname,
          role: contributor.role,
          isHeadliner: contributor.isHeadliner,
          photoUrl: contributor.photoUrl,
          photo: undefined,
        });
      } else {
        reset({
          fullname: "",
          role: "",
          isHeadliner: false,
          photoUrl: undefined,
          photo: undefined,
        });
      }
    }
  }, [contributor, isOpen, reset]); // Dependency array đã an toàn

  const onSubmit = async (data: EventContributor) => {
    setIsSubmitting(true);
    try {
      const dataToSubmit = { ...data };

      if (dataToSubmit.photo && dataToSubmit.photo instanceof File) {
        dataToSubmit.photoUrl =
          await EventManagementService.uploadContributorUrls({
            file: dataToSubmit.photo,
            userID: userProfile?.userID!,
          });
      }

      delete dataToSubmit.photo;

      if (contributor) {
        console.log("data: ", JSON.stringify(dataToSubmit));
        await updateContributor({
          eventID,
          contributorID: contributor.contributorID!,
          data: dataToSubmit,
        });
      } else {
        await createContributor({ eventID, data: dataToSubmit });
      }

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            {contributor ? "Edit Contributor" : "Add New Contributor"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <PhotoUploader
                form={form}
                initialPhotoUrl={contributor?.photoUrl}
              />

              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="fullname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Full Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name..."
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Role <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Keynote Speaker, MC, Presenter..."
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isHeadliner"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-yellow-300 transition-colors duration-200 bg-gradient-to-r from-yellow-50/50 to-orange-50/50">
                        <FormControl>
                          <Checkbox
                            hidden
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                          />
                        </FormControl>
                        <div className="flex-1">
                          <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                            <Star
                              className={`w-4 h-4 transition-colors duration-200 ${
                                field.value
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-400"
                              }`}
                            />
                            Mark as Headliner
                          </FormLabel>
                          <p className="text-xs text-gray-500 mt-1">
                            Featured prominently in event materials
                          </p>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex gap-3 pt-4 border-t bg-gray-50 -mx-6 px-6 pb-0 mb-0">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 h-11 font-medium"
                    disabled={isMutating}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  loading={isMutating}
                  type="submit"
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 font-medium shadow-sm"
                >
                  {contributor ? "Update Contributor" : "Add Contributor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
