import toast from "react-hot-toast";

export const showInAppNotification = (sender, message, onSelect) => {
  toast.custom(
    (t) => (
      <div
        onClick={() => {
          if (onSelect) onSelect(sender);
          toast.dismiss(t.id);
        }}
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-sm w-full bg-base-100 border border-primary/30 shadow-2xl rounded-2xl pointer-events-auto flex items-center p-3 gap-3 cursor-pointer hover:bg-base-200 transition-all ring-1 ring-base-content/10 select-none`}
      >
        <div className="relative shrink-0">
          <img
            className="size-10 rounded-full object-cover border border-base-300"
            src={sender.profilePic || "/avatar.png"}
            alt={sender.fullName}
          />
          <span className="absolute bottom-0 right-0 size-2.5 bg-primary rounded-full ring-2 ring-base-100" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-base-content">
            {sender.fullName}
          </p>
          <p className="text-xs text-base-content/70 truncate">
            {message.text || (message.image ? "📷 Sent a photo" : "New message")}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="btn btn-ghost btn-circle btn-xs text-base-content/50 hover:text-base-content"
          title="Dismiss notification"
        >
          ✕
        </button>
      </div>
    ),
    { duration: 4000, position: "top-right" }
  );
};

