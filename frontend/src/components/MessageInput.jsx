import { useRef, useState, useEffect, useCallback } from "react";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { Image, Send, X, Reply } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  const { sendMessage, replyingTo, setReplyingTo, selectedUser } = useChatStore();
  const { authUser } = useAuthStore();

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const emitStopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      const socket = useAuthStore.getState().socket;
      if (socket && selectedUser) {
        socket.emit("stopTyping", { receiverId: selectedUser._id });
      }
    }
  }, [selectedUser]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitStopTyping();
    };
  }, [emitStopTyping]);

  useEffect(() => {
    if (replyingTo && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [replyingTo]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    const socket = useAuthStore.getState().socket;
    if (!socket || !selectedUser) return;

    if (val.trim().length > 0) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        socket.emit("typing", { receiverId: selectedUser._id });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping();
      }, 2000);
    } else {
      emitStopTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    emitStopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && replyingTo) {
      setReplyingTo(null);
    }
  };

  return (
    <div className="p-4 w-full">
      {/* Reply Preview Card */}
      {replyingTo && (
        <div className="mb-2 p-2.5 px-3 bg-base-200 border-l-4 border-primary rounded-lg flex items-center justify-between gap-3 text-xs shadow-xs transition-all">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Reply className="size-4 text-primary shrink-0" />
            <div className="overflow-hidden">
              <p className="font-semibold text-primary">
                Replying to{" "}
                {replyingTo.senderId?._id === authUser?._id || replyingTo.senderId === authUser?._id
                  ? "yourself"
                  : replyingTo.senderId?.fullName || selectedUser?.fullName || "User"}
              </p>
              <div className="flex items-center gap-1.5 text-base-content/70 truncate mt-0.5">
                {replyingTo.image && (
                  <span className="flex items-center gap-1 shrink-0 font-medium text-base-content/80">
                    <Image className="size-3" /> Photo
                  </span>
                )}
                {replyingTo.image && replyingTo.text && <span>·</span>}
                {replyingTo.text && (
                  <span className="truncate">{replyingTo.text}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {replyingTo.image && (
              <img
                src={replyingTo.image}
                alt="Reply preview thumbnail"
                className="size-8 object-cover rounded border border-base-300"
              />
            )}
            <button
              onClick={() => setReplyingTo(null)}
              className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
              type="button"
              title="Cancel reply (Esc)"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            ref={textInputRef}
            onKeyDown={handleKeyDown}
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            value={text}
            onChange={handleTextChange}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle btn-ghost ${imagePreview ? "text-secondary" : "text-base-content/50"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm border-r-2 btn-primary py-5"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;