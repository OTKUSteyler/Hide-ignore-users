import { before } from "@vendetta/patcher";
import { getBlockedUsers } from "@vendetta/metro/common/BlockedUsers";
import { findByProps } from "@vendetta/metro";

let patches = [];

export const onLoad = () => {
    const MessageComponent = findByProps("renderMessageContent");

    patches.push(
        before("renderMessageContent", MessageComponent, ([props]) => {
            const userId = props?.message?.author?.id;
            if (getBlockedUsers().includes(userId)) {
                props.message.content = "[Blocked user message hidden]";
            }
        })
    );
};

export const onUnload = () => {
    patches.forEach(unpatch => unpatch());
    patches = [];
};
