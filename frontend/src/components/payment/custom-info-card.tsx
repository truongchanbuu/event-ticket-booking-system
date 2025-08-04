"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PaymentCustomerFormInfo } from "@/schema/payments/payment-customer-form.schema";
import { useFormContext } from "react-hook-form";

export default function PaymentCustomerInfo() {
  const form = useFormContext<PaymentCustomerFormInfo>();

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Information
        </h3>

        <Form {...form}>
          <form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="mb-1 block">Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your Name"
                        {...field}
                        className={cn(
                          "transition-colors",
                          fieldState.invalid
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="mb-1 block">
                      Email Address *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                        className={cn(
                          "transition-colors",
                          fieldState.invalid
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="mb-1 block">Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        {...field}
                        className={cn(
                          "transition-colors",
                          fieldState.invalid
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="mb-1 block">Date of Birth</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className={cn(
                          "transition-colors",
                          fieldState.invalid
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
