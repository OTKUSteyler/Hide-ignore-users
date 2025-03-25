import { after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";

// Get the function responsible for rendering messages
const MessageRender = findByProps("renderMessage");

let patch;

export function onLoad() {
    console.log("[HideIgnoredMessages] Plugin Loaded");

    patch = after("renderMessage", MessageRender, (args, render) => {
        const message = args[0]?.message;
        if (!message) return render;

        const userId = message.author?.id;
        if (isUserIgnored(userId)) {
            console.log(`[HideIgnoredMessages] Hiding message from ignored user ${userId}`);
            return null; // Hide the message
        }
        
        return render;
    });
}

export function onUnload() {
    console.log("[HideIgnoredMessages] Plugin Unloaded");
    if (patch) patch();
}

// Function to check if a user is ignored
function isUserIgnored(userId) {
    const Settings = findByProps("getIgnoredUsers");
    const ignoredUsers = Settings?.getIgnoredUsers?.() || [];
    console.log("[HideIgnoredMessages] Ignored users list:", ignoredUsers);

    return ignoredUsers.includes(userId);
}
