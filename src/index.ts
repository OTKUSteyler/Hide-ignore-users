import { FluxDispatcher } from '@vendetta/metro/common';
import { before } from "@vendetta/patcher";
import { findByProps, findByName } from "@vendetta/metro";
import { logger } from "@vendetta";

const pluginName = "HideIgnoredMessages";
const RowManager = findByName("RowManager");
const RelationshipStore = findByProps("isIgnoredUser");

let patches = [];

const isIgnored = (id) => RelationshipStore.isIgnoredUser?.(id);

// Create a dummy message to trigger handlers on load
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

const startPlugin = () => {
    try {
        // Patch message events
        const patch1 = before("dispatch", FluxDispatcher, ([event]) => {
            if (event.type === "LOAD_MESSAGES_SUCCESS") {
                event.messages = event.messages.filter(
                    (message) => !isIgnored(message?.author?.id)
                );
            }

            if (event.type === "MESSAGE_CREATE" || event.type === "MESSAGE_UPDATE") {
                const message = event.message;
                if (isIgnored(message?.author?.id)) {
                    event.channelId = "0"; // Prevent it from appearing
                }
            }
        });
        patches.push(patch1);

        // UI fallback patch for message rows
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

export const onLoad = () => {
    logger.log(`Loading ${pluginName}...`);

    // Dispatch fake events to initialize dispatcher paths
    for (const type of ["MESSAGE_CREATE", "MESSAGE_UPDATE"]) {
        FluxDispatcher.dispatch({
            type,
            message: constructMessage("PLACEHOLDER", { id: "0" }),
        });
    }

    for (const type of ["LOAD_MESSAGES", "LOAD_MESSAGES_SUCCESS"]) {
        FluxDispatcher.dispatch({ type, messages: [] });
    }

    startPlugin();
};

export const onUnload = () => {
    logger.log(`Unloading ${pluginName}...`);
    for (const unpatch of patches) unpatch();
    logger.log(`${pluginName} unloaded.`);
};
