import { FluxDispatcher } from '@vendetta/metro/common';
import { before, } from "@vendetta/patcher"
import { findByProps, findByName } from "@vendetta/metro"
import { logger } from "@vendetta"

const RowManager = findByName("RowManager");

const RelationshipStore = findByProps("RelationshipStore.isIgnored", "isBlocked");
const pluginName = "HideignoredMessages";
  
function constructMessage(message, channel ) {
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
};

// Function to check blocked users
const isBlocked = (id) => {
    return RelationshipStore.isIgnored(id);
};

let patches = [];

const startPlugin = () => {
    try {
        // Main patch
        const patch1 = (
            before("dispatch", FluxDispatcher, ([event]) => {
                // Hides blocked messages on channel loads
                if (event.type === "LOAD_MESSAGES_SUCCESS") {
                    event.messages = event.messages.filter((message) => { 
                        return (!isBlocked(message?.author?.id));
                    });
                }
                // Hides blocked messages on message creation/update
                if (event.type === "MESSAGE_CREATE" || event.type === "MESSAGE_UPDATE") {
                    let message = event.message;

                    if (isBlocked(message?.author?.id)) {
                        // Drop event
                        event.channelId = "0"
                    };
                }
            })
        );
        patches.push(patch1);

        // Fallback patch to mostly remove blocked message rows if main patch doesn't work on first load
        const patch2 = (
            before("generate", RowManager.prototype, ([data]) => {
                if (isBlocked(data.message?.author?.id)) {
                    data.renderContentOnly = true
                    data.message.content = null
                    data.message.reactions = []
                    data.message.canShowComponents= false
                    if (data.rowType === 2) {
                        data.roleStyle = ""
                        data.text = "[Temp] Blocked message. Reloading should fix."
                        data.revealed = false
                        data.content = []
                    }
                }
            })
        );
        patches.push(patch2);

        logger.log(`${pluginName} loaded.`);
        return null;
    } catch (err) {
        logger.log(`[${pluginName} Error]`, err);
    };
}

// Load Plugin
const onLoad = () => {
    logger.log(`Loading ${pluginName}...`);

    // Dispatch with a fake event to enable the action handlers from first loadup
    for (let type of ["MESSAGE_CREATE", "MESSAGE_UPDATE"]) {
        logger.log(`Dispatching ${type} to enable action handler.`);
        FluxDispatcher.dispatch({
            type: type,
            message: constructMessage('PLACEHOLDER', { id: '0' }),
        });
    };

    // Dispatch with a fake event to enable the action handlers from first loadup
    for (let type of ["LOAD_MESSAGES", "LOAD_MESSAGES_SUCCESS"]) {
        logger.log(`Dispatching ${type} to enable action handler.`);
        FluxDispatcher.dispatch({
            type: type,
            messages: [],
        });
    };

    // Begin patch sequence
    startPlugin();
};

export default {
    onLoad,
    onUnload: () => {
        logger.log(`Unloading ${pluginName}...`);
        for (let unpatch of patches) {
            unpatch();
        };
        logger.log(`${pluginName} unloaded.`);
    }
};
