let React              = require('react');
let mui                = require('material-ui');
let Reflux             = require('reflux');
let ConversationsStore = require('../stores/conversations');
let Actions            = require('../actions');

let Snackbar = mui.Snackbar;

let ConversationView  = require('./conversation_view');
let ConversationsList = require('./conversations_list');

let App = React.createClass({
  mixins: [
    Reflux.listenTo(Actions.connection, "onConnection"),
    Reflux.listenTo(Actions.connectionLost, "onConnectionLost"),
    Reflux.listenTo(Actions.loginFailed, "onLoginFailed"),
    Reflux.connect(ConversationsStore, "conversations"),
  ],

  componentDidMount () {
    let Connection = new Strophe.Connection('http://zeonfed.org:5280/http-bind');

    Connection.connect(this.props.jid, this.props.password, function (status) {
      console.log('Connection status', status);

      if (status === Strophe.Status.CONNECTED) {
        Actions.connection();
      } else if (status === Strophe.Status.DISCONNECTED) {
        Actions.connectionLost();
      } else if (status === Strophe.Status.AUTHFAIL) {
        Actions.loginFailed();
      }
    });

    Connection.roster.registerCallback(function (items, item, previousItem) {
      Actions.rosterChange(items);
    });

    Connection.roster.registerRequestCallback(function (jid) {
      Actions.rosterRequestReceived(jid);
    });

    Connection.addHandler(function (message) {
      Actions.messageReceived(message);
      return true;
    }, null, 'message', 'chat');

    window.Connection = Connection;
  },

  componentWillUnmount () {
    Connection.disconnect();
    window.Connection = null;
  },

  onConnection () {
    this.refs.sbConnectionEstablished.show();
  },

  onConnectionLost () {
    this.refs.sbConnectionLost.show();
  },

  onLoginFailed () {
    this.refs.sbLoginFailed.show();
  },

  render () {
    return (
      <div className="wrapper">
        <ConversationView jid={this.state.conversations.opened} />
        <ConversationsList />

        <Snackbar ref="sbConnectionEstablished" message="Connection established" autoHideDuration={2000} />
        <Snackbar ref="sbConnectionLost" message="Connection lost" />
        <Snackbar ref="sbLoginFailed" message="Login failed" action="Correct login details" onActionTouchTap={Actions.logout} />
      </div>
    );
  },

});

module.exports = App;