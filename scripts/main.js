/** Main entry point for the module.
 *
 *  @author Jan Schoska
 *
 *  TODO: Let GM defined actors than be used as contacts. By world scope?
 *  TODO: Update contactableActors on actor CRUD actions.
 *  TODO: How to handle a user with multiple owned actors?
 *  TODO: use SR5Actor.setFlag / getFlag to store contacts
 *
 *  TODO: Storing list data with Entity.setFlag ONLY stores persistantly accross refreshes using JSON...
 *  TODO: How to send messages from user to user? Socket? game.socket?
 *
 */

const ActorContactsFlag = ['actor-communicator', 'contactIds'];


class ActorCommunicatorApp extends Application {
    contactableActors = [];
    selectedContact = null;

    activateListeners(html) {
        console.error('activateListeners');
        super.activateListeners(html);

        //html.find('input[name="contact-add"]').change(this.onContactAddChange);
        html.find('.add-contact').click(this.onAddActorAsContact);
        html.find('.remove-contact').click(this.onRemoveContact);
        html.find('.select-contact').click(this.onSelectContact);
        html.find('.add-chat-text').change(this.onAddChatText);
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = "auto";
        options.height = "auto";
        options.id = "actor-communicator-personal";
        options.title = "Communicator";
        options.classes = ['actor-communicator'];
        options.template = "modules/actor-communicator/templates/actor-communicator.html";
        return options;
    }

    getData = () => {
        console.error('getData');
        const actors = game.actors.entries ? game.actors.entries : [];

        let actor = null;
        if (this._userActorHasContacts()) {
            actor = game.user.character;
        }

        const contacts = this._getActorContacts(actor);
        console.error(contacts);
        const selectedContact = {
            contact: this.selectedContact,
            chatHistory: this._getContactChatHistory(actor, this.selectedContact)
        };

        return {
            actor,
            actors,
            contacts,
            selectedContact
        }
    }

    _userActorHasContacts() {
        return game.user.character !== null;
    }

    _actorHasContactAlready(actor, contact) {
        const contactIds = this._getActorContactIds(actor);
        return contactIds.indexOf(contact.id) !== -1;
    }

    _actorHasContactMissing(actor, contact) {
        return !this._actorHasContactAlready(actor, contact);
    }

    _getActorContactIds(actor) {
        const contactIds = JSON.parse(actor.getFlag('actor-communicator', 'contactIds'));
        return contactIds ? contactIds : [];
    }

    _getActorContacts(actor) {
        const contactIds = this._getActorContactIds(actor);
        return contactIds.map(id => game.actors.get(id));
    }

    async _addActorContact(actor, contact) {
        // await actor.sunetFlag('actor-communicator', 'contactIds');
        let contactIds = this._getActorContactIds(actor);

        if (this._actorHasContactMissing(actor, contact)) {
            contactIds.push(contact.id);
            await actor.setFlag('actor-communicator', 'contactIds', JSON.stringify(contactIds));
        }

        return contactIds
    }

    async _removeActorContact(actor, contact) {
        let contactIds = this._getActorContactIds(actor);
        const contactIndex = contactIds.indexOf(contact.id);
        if (contactIndex === -1) {
            return;
        }
        contactIds = contactIds.filter(contactId => contactId !== contact.id);
        console.error('remove', contactIds, contactIndex, contact.id);
        await actor.setFlag('actor-communicator', 'contactIds', JSON.stringify(contactIds));
        return contactIds;
    }

    _getContactsChatHistory(actor) {
        if (!actor) {
            return null;
        }
        const chatHistory = actor.getFlag('actor-communicator', 'chat-history');
        console.error('getContactChatHistory', chatHistory);
        return chatHistory ? chatHistory : {};
    }

    _getContactChatHistory(actor, contact) {
        if (!contact) {
            return null;
        }
        const contactsChatHistory = this._getContactsChatHistory(actor);
        return contactsChatHistory[contact.id] ? contactsChatHistory[contact.id] : [];
    }

    // TODO: Add 'send at' o'clock data
    _newChatMessage(sender, recipient, chatText) {
        return {senderId: sender.id,
                recipientId: recipient.id,
                text: chatText}
    }

    async _appendContactChatText(actor, contact, chatText) {
        const chatMessage = this._newChatMessage(actor, contact, chatText);
        console.error(chatMessage);

        const chatHistory = this._getContactsChatHistory(actor, contact);
        console.error(chatHistory);
        chatHistory[contact.id] = chatHistory[contact.id] ? chatHistory[contact.id] : [];
        chatHistory[contact.id].push(chatMessage);
        console.error(chatMessage);
        await actor.setFlag('actor-communicator', 'chat-history', chatHistory);
    }

    onAddActorAsContact = (event) => {
        const actor = game.user.character;
        if (!actor) {
            return;
        }

        const contactId = event.currentTarget.getAttribute('data-actor-id');
        if (!contactId) {
            return;
        }

        const contact = game.actors.get(contactId);
        this._addActorContact(actor, contact).then(contacts => {
            this.render();
        });
    }

    onRemoveContact = (event) => {
        console.error('onRemoveContact');
        const actor = game.user.character;
        if (!actor) {
            return;
        }

        const contactId = event.currentTarget.getAttribute('data-actor-id');
        if (!contactId) {
            return;
        }

        const contact = game.actors.get(contactId);
        this._removeActorContact(actor, contact).then(contactIds => {
            this.render();
        });
    }

    onSelectContact = (event) => {
        console.error('onSelectContact');
        const contactId = event.currentTarget.getAttribute('data-actor-id');
        if (!contactId) {
            return;
        }

        this.selectedContact = game.actors.get(contactId);
        console.error(this.selectedContact);
        this.render();
    }

    onAddChatText = (event) => {
        console.error('onAddChatText');
        const chatText = event.currentTarget.value;
        if (!chatText || !chatText.length || chatText.length === 0) {
            return;
        }

        const actor = game.user.character;
        if (!actor) {
            return;
        }

        if (this.selectedContact === null) {
            return;
        }

        this._appendContactChatText(actor, this.selectedContact, chatText).then(chatHistory => {
            this.render();
        })
    }
}


Hooks.on('ready', () => {
    console.error('Actor Communicator', game);
    const users = game.users.entries;

    console.error(game.modules.keys());

    console.error('Get');
    Object.values(users).forEach(user => {
        console.error(user.name, user.getFlag('actor-communicator', 'data'));
    });

    // console.error('Set');
    // Object.values(users).forEach(user => {
    //     console.error(user.name, user.isGM);
    //     if (!user.isGM) {
    //         user.setFlag('actor-communicator', 'data', {test: 'Hallo'});
    //     }
    // });

    // NOTE: Just as a placeholder, should a 'call' slide in from viewportBorder.
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth ||
        document.body.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight ||
        document.body.clientHeight;
    console.error(viewportWidth, viewportHeight);

    const actorComApp = new ActorCommunicatorApp().render(true);

    // actorComApp.setPosition()
});