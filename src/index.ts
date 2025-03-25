import { after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";

// Get the message rendering function
const Messages = findByProps("getMessages", "sendMessage");

// Function to hide messages from ignored users
const patch = after("getMessages", Messages, (args, messages) => {
    return messages.filter(msg => {
        const userId = msg.author.id;
        return !isUserIgnored(userId);
    });
});

// Function to check if a user is ignored
function isUserIgnored(userId) {
    const ignoredUsers = getIgnoredUsers(); // Fetch ignored users list
    return ignoredUsers.includes(userId);
}

// Fetch ignored users list (this may need adjustments based on Vendetta's API)
function getIgnoredUsers() {
    const Settings = findByProps("getIgnoredUsers");
    return Settings?.getIgnoredUsers() || [];
}

// Cleanup function
export function onUnload() {
    patch();
}
