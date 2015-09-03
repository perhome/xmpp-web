let Reflux    = require('reflux');
let Actions   = require('../actions.js');
let Immutable = require('immutable');
let moment    = require('moment');

let ConnectionStore = require('./connection');

let ConversationsStore = Reflux.createStore({

  init () {
    this.listenTo(ConnectionStore, this.onConnectionStore);
    this.listenTo(Actions.openChat, this.onOpenChat);
    this.listenTo(Actions.closeChat, this.onCloseChat);
    this.listenTo(Actions.messageReceived, this.onMessageReceived);
    this.listenTo(Actions.sendMessage, this.onSendMessage);
  },

  onConnectionStore (store) {
    this.connection = store.connection;
  },

  onOpenChat (jid) {
    this.opened = jid;
    this._notify();
  },

  onCloseChat () {
    this.opened = false;
    this._notify();
  },

  onMessageReceived (stanza) {
    let from = stanza.getAttribute('from');
    let jid  = Strophe.getBareJidFromJid(from);

    if (stanza.querySelectorAll('body').length === 0) {
      // Chat State Notification
      let states = stanza.querySelectorAll('active, composing, inactive, paused, gone');

      if (states.length > 0) {
        Actions.rosterStateChange(jid, states[0].tagName);
      }

      return;
    }

    let body = stanza.querySelector('body').textContent;

    this.messages = this.messages.update(jid, Immutable.List(), function (val) {
      return val.push(Immutable.Map({
        from: from,
        body: body,
        time: moment().format(),
      }));
    });

    this._notify();
  },

  onSendMessage (jid, body) {
    let sender = this.connection.jid;

    let stanza = $msg({
      from: sender,
      to: jid,
      type: 'chat',
    }).c('body').t(body).up().c('active', {
      xmlns: Strophe.NS.CHATSTATES,
    }).up();

    this.connection.send(stanza);

    this.messages = this.messages.update(jid, Immutable.List(), function (val) {
      return val.push(Immutable.Map({
        from: sender,
        body: body,
        time: moment().format(),
      }));
    });

    this._notify();
  },

  getInitialState () {
    if (typeof this.opened === 'undefined') {
      this.opened = false;
    }

    if (typeof this.messages === 'undefined') {
      this.messages = Immutable.Map();
    }

    return {
      opened:   this.opened,
      messages: this.messages,
    };
  },

  _notify () {
    this.trigger({
      opened:   this.opened,
      messages: this.messages,
    });
  },

});

module.exports = ConversationsStore;
