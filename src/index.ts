import { logger } from "@vendetta";
import { findByName, findByProps } from "@vendetta/metro";
import { after, before } from "@vendetta/patcher";

let patches = [];

export default {
  onLoad() {
    // Find necessary modules
    const MessageModule = findByName("Message");
    const RelationshipModule = findByProps("isIgnored");

    // Patch message rendering to hide messages from ignored users
    const messagePatch = before("type", MessageModule, (args) => {
      try {
        const message = args[0];
        // Hide message if author is ignored
        if (RelationshipModule.isIgnored(message.author.id)) {
          return [null];
        }
      } catch (e) {
        logger.error("Failed to hide ignored user message", e);
      }
    });

    // Patch DM channel list to remove channels with ignored users
    const ChannelModule = findByProps("getPrivateChannels");
    
    const channelPatch = before("getPrivateChannels", ChannelModule, (args) => {
      try {
        const channels = args[0];
        // Filter out channels with ignored users
        return [channels.filter(channel => {
          const recipientId = channel.recipients[0];
          return !RelationshipModule.isIgnored(recipientId);
        })];
      } catch (e) {
        logger.error("Failed to filter DM channels", e);
      }
    });

    // Store patches for unloading
    patches = [messagePatch, channelPatch];
  },

  onUnload() {
    // Remove all patches
    patches.forEach(patch => patch());
    patches = [];
  }
};
