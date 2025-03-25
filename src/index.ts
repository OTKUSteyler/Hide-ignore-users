import { Plugin } from '@vizality/entities';
import { patch, unpatch } from '@vizality/patcher';
import { getModule } from '@vizality/webpack';

export default class HideIgnoredUsersPlugin extends Plugin {
  constructor() {
    super();
  }

  start() {
    // Patch chat message rendering
    this.patchChatMessages();
    
    // Patch direct message channel list
    this.patchDMChannels();
  }

  stop() {
    // Unpatch all modifications when plugin is disabled
    unpatch('hide-ignored-users-chat');
    unpatch('hide-ignored-users-dm');
  }

  patchChatMessages() {
    const MessageModule = getModule(m => m.type?.displayName === 'Message');
    
    patch('hide-ignored-users-chat', MessageModule, 'type', (args, res) => {
      const message = args[0];
      
      // Check if the user is ignored
      if (this.isUserIgnored(message.author.id)) {
        // Return null to hide the message
        return null;
      }
      
      return res;
    });
  }

  patchDMChannels() {
    const DMChannelModule = getModule(m => m.getPrivateChannels);
    
    patch('hide-ignored-users-dm', DMChannelModule, 'getPrivateChannels', (args, channels) => {
      // Filter out DM channels with ignored users
      return channels.filter(channel => {
        const recipientId = channel.recipients[0];
        return !this.isUserIgnored(recipientId);
      });
    });
  }

  isUserIgnored(userId) {
    // Get the user relationship module
    const RelationshipModule = getModule(m => m.getName && m.isBlocked);
    
    // Check if the user is blocked/ignored
    return RelationshipModule.isBlocked(userId);
  }

  // Optional: Add settings to configure plugin behavior
  getSettingsPanel() {
    return (
      <div>
        <h2>Hide Ignored Users Plugin</h2>
        <p>Automatically hides messages and DM channels from ignored users.</p>
      </div>
    );
  }
}
