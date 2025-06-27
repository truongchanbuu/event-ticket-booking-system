import type { PurchaseWithDetails } from "@shared/schema"
import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  Check,
  Home,
  MapPin,
  PrinterCheck,
  Ticket,
} from "lucide-react"
import { Link, useParams } from "wouter"

import { formatCurrency, formatDate, generateQRCodeData } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import QRCode from "@/components/payment/qr-code"

export default function SuccessPage() {
  const { purchaseId } = useParams()

  const { data: purchase, isLoading } = useQuery<PurchaseWithDetails>({
    queryKey: [`/api/purchases/${purchaseId}`],
    enabled: !!purchaseId,
  })

  const printTicket = () => {
    window.print()
  }

  const goHome = () => {
    window.location.href = "/"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Purchase not found</p>
            <Link href="/">
              <Button className="mt-4">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const qrCodeData = generateQRCodeData(purchase.id, purchase.qrCode || "")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">EventHub</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-8">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-white text-2xl h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600">
                You have successfully purchased your tickets for{" "}
                {purchase.event.name}
              </p>
            </div>

            {/* QR Code Section */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <QRCode value={qrCodeData} size={128} />
              </div>
              <p className="text-sm text-gray-600">
                Show this QR code at the venue entrance
              </p>
            </div>

            {/* Ticket Details */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-gray-600 flex items-center">
                  <Ticket className="mr-2 h-4 w-4" />
                  Event
                </span>
                <span className="font-medium text-right">
                  {purchase.event.name}
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-gray-600 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Date & Time
                </span>
                <span className="font-medium text-right">
                  {formatDate(purchase.event.date)}
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-gray-600 flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Venue
                </span>
                <span className="font-medium text-right">
                  {purchase.event.venue}
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-gray-600">Tickets</span>
                <div className="text-right">
                  {purchase.items.map((item, index) => (
                    <div key={item.id} className="font-medium">
                      {item.quantity} × {item.ticketType.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between border-b border-gray-100 py-2">
                <span className="text-gray-600">Total Paid</span>
                <span className="font-bold text-primary text-lg">
                  {formatCurrency(purchase.totalAmount)}
                </span>
              </div>

              {purchase.qrCode && (
                <div className="flex justify-between border-b border-gray-100 py-2">
                  <span className="text-gray-600">Ticket ID</span>
                  <span className="font-medium font-mono text-sm">
                    {purchase.qrCode}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 print:hidden">
              <Button
                onClick={printTicket}
                className="flex-1 bg-secondary text-white hover:bg-secondary/90"
              >
                <PrinterCheck className="mr-2 h-4 w-4" />
                PrinterCheck Ticket
              </Button>
              <Button onClick={goHome} variant="outline" className="flex-1">
                <Home className="mr-2 h-4 w-4" />
                Back to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
