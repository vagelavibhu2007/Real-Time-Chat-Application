import { Link } from "react-router";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";
import { LogOut, MessageSquare, Settings, User, Bell, BellOff, BellRing } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const {
    unreadCounts,
    notificationPermission,
    requestNotificationPermission,
  } = useChatStore();

  const totalUnread = Object.values(unreadCounts || {}).reduce(
    (total, count) => total + (count || 0),
    0
  );
  const hasNotificationSupport =
    typeof window !== "undefined" && "Notification" in window;

  const handleNotificationClick = async () => {
    if (notificationPermission !== "granted") {
      await requestNotificationPermission();
    }
  };

  return (
    <header
      className="bg-base-100/80 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2.5 hover:opacity-80 transition-all"
            >
              <div className="relative size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-content text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-base-100 animate-in zoom-in-75">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold">Saṃlāpaḥ</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Notification Permission Button */}
            {authUser && hasNotificationSupport && (
              <button
                type="button"
                onClick={handleNotificationClick}
                className={`btn btn-sm btn-ghost gap-1.5 transition-colors ${
                  notificationPermission === "granted"
                    ? "text-emerald-500 hover:bg-emerald-500/10"
                    : notificationPermission === "denied"
                    ? "text-zinc-400 hover:bg-base-200"
                    : "text-primary hover:bg-primary/10 animate-pulse"
                }`}
                title={
                  notificationPermission === "granted"
                    ? "Desktop notifications are enabled"
                    : notificationPermission === "denied"
                    ? "Desktop notifications are blocked in your browser"
                    : "Click to enable desktop notifications"
                }
              >
                {notificationPermission === "granted" ? (
                  <BellRing className="w-4 h-4" />
                ) : notificationPermission === "denied" ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                <span className="hidden md:inline text-xs">
                  {notificationPermission === "granted"
                    ? "Alerts On"
                    : notificationPermission === "denied"
                    ? "Alerts Blocked"
                    : "Enable Alerts"}
                </span>
              </button>
            )}

            <Link
              to={"/settings"}
              className="btn btn-sm gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link to={"/profile"} className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button
                  className="flex gap-2 items-center btn btn-sm btn-ghost text-error/80 hover:text-error"
                  onClick={logout}
                >
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;