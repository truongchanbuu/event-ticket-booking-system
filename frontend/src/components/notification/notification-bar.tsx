import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Notification } from "@/schema";

interface NotificationBarProps {
  onClose: () => void;
}

export default function NotificationBar({ onClose }: NotificationBarProps) {
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/user/1"], // Using user ID 1 for demo
  });

  if (isLoading) {
    return (
      <div className="fixed top-16 right-4 bg-white rounded-lg shadow-xl border border-gray-200 w-80 z-50">
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="fixed top-16 right-4 w-80 max-h-96 overflow-y-auto z-50 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Notifications</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-gray-200">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start space-x-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    notification.isRead ? "bg-gray-300" : "bg-blue-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {notification.createdAt
                      ? formatDate(notification.createdAt.toString())
                      : ""}
                  </p>
                </div>
                {!notification.isRead && (
                  <Badge variant="secondary" className="text-xs">
                    New
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            className="w-full text-blue-600 hover:text-blue-800"
          >
            View All Notifications
          </Button>
        </div>
      )}
    </Card>
  );
}
