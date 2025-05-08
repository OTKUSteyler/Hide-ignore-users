import { FluxDispatcher } from '@vendetta/metro/common';
import { before } from "@vendetta/patcher";
import { findByProps, findByName } from "@vendetta/metro";
import { logger } from "@vendetta";

const RowManager = findByName("RowManager");

// Look for the store with the 'isIgnoredUser' method
const RelationshipStore = findByProps("isIgnoredUser");
const pluginName = "HideIgnoredMessages";

// Fallback in case the store doesn't load
if (!RelationshipStore?.isIgnoredUser) {
    logger.error(`[${pluginName}] Could not find isIgnoredUser in RelationshipStore`);
}

// Function to construct a dummy message
function constructMessage(message, channel) {
    let msg = {
        id: '',
        type: 0,
        content: '',
        channel_id: channel.id,
        author: {
            id: '',
            username: '',
            avatar: '',
            discriminator: '',
            publicFlags: 0,
            avatarDecoration: null,
        },
        attachments: [],
        embeds: [],
        mentions: [],
        mention_roles: [],
        pinned: false,
        mention_everyone: false,
        tts: false,
        timestamp: '',
        edited_timestamp: null,
        flags: 0,
        components: [],
    };

    if (typeof message === 'string') msg.content = message;
    else msg = { ...msg, ...message };

    return msg;
}

// Function to check ignored users
const isIgnored = (id) => {
    return RelationshipStore?.isIgnoredUser?.(id);
};

let patches = [];

const startPlugin = () => {
    try {
        // Main patch
        const patch1 = before("dispatch", FluxDispatcher, ([event]) => {
            if (event.type === "LOAD_MESSAGES_SUCCESS") {
                event.messages = event.messages.filter((message) => {
                    return !isIgnored(message?.author?.id);
                });
            }

            if (event.type === "MESSAGE_CREATE" || event.type === "MESSAGE_UPDATE") {
                const message = event.message;
                if (isIgnored(message?.author?.id)) {
                    event.channelId = "0"; // drop event
                }
            }
        });
        patches.push(patch1);

        // UI row filter fallback
        const patch2 = before("generate", RowManager.prototype, ([data]) => {
            if (isIgnored(data.message?.author?.id)) {
                data.renderContentOnly = true;
                data.message.content = null;
                data.message.reactions = [];
                data.message.canShowComponents = false;
                if (data.rowType === 2) {
                    data.roleStyle = "";
                    data.text = "[Temp] Ignored message. Reloading should fix.";
                    data.revealed = false;
                    data.content = [];
                }
            }
        });
        patches.push(patch2);

        logger.log(`${pluginName} loaded.`);
    } catch (err) {
        logger.error(`[${pluginName} Error]`, err);
    }
};

const onLoad = () => {
    logger.log(`Loading ${pluginName}...`);

    // Trigger dispatcher readiness
    for (let type of ["MESSAGE_CREATE", "MESSAGE_UPDATE"]) {
        logger.log(`Dispatching ${type} to enable action handler.`);
        FluxDispatcher.dispatch({
            type: type,
            message: constructMessage('PLACEHOLDER', { id: '0' }),
        });
    }

    for (let type of ["LOAD_MESSAGES", "LOAD_MESSAGES_SUCCESS"]) {
        logger.log(`Dispatching ${type} to enable action handler.`);
        FluxDispatcher.dispatch({
            type: type,
            messages: [],
        });
    }

    startPlugin();
};

export default {
    onLoad,
    onUnload: () => {
        logger.log(`Unloading ${pluginName}...`);
        for (let unpatch of patches) {
            unpatch();
        }
        logger.log(`${pluginName} unloaded.`);
    }
};
