"use strict";

var _interopRequireWildcard = require("@babel/runtime-corejs3/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");

var _Object$defineProperty = require("@babel/runtime-corejs3/core-js-stable/object/define-property");

var _Object$defineProperties = require("@babel/runtime-corejs3/core-js-stable/object/define-properties");

var _Object$getOwnPropertyDescriptors = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-descriptors");

var _forEachInstanceProperty = require("@babel/runtime-corejs3/core-js-stable/instance/for-each");

var _Object$getOwnPropertyDescriptor = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-descriptor");

var _filterInstanceProperty = require("@babel/runtime-corejs3/core-js-stable/instance/filter");

var _Object$getOwnPropertySymbols = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-symbols");

var _Object$keys2 = require("@babel/runtime-corejs3/core-js-stable/object/keys");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

_Object$defineProperty(exports, "__esModule", {
  value: true
});

exports.default = exports.Cli = void 0;

var _keys = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/object/keys"));

var _reduce = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/reduce"));

var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));

var _indexOf = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/index-of"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/defineProperty"));

var _http = _interopRequireDefault(require("http"));

var _url = _interopRequireDefault(require("url"));

var _crypto = _interopRequireDefault(require("crypto"));

var _open = _interopRequireDefault(require("open"));

var _commander = require("commander");

var _inquirer = _interopRequireDefault(require("inquirer"));

var _request = _interopRequireDefault(require("../request"));

var _base64url = _interopRequireDefault(require("base64url"));

var _repl = _interopRequireDefault(require("./repl"));

var _ = _interopRequireWildcard(require(".."));

var _VERSION = _interopRequireDefault(require("../VERSION"));

function ownKeys(object, enumerableOnly) { var keys = _Object$keys2(object); if (_Object$getOwnPropertySymbols) { var symbols = _Object$getOwnPropertySymbols(object); if (enumerableOnly) symbols = _filterInstanceProperty(symbols).call(symbols, function (sym) { return _Object$getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { var _context2; _forEachInstanceProperty(_context2 = ownKeys(Object(source), true)).call(_context2, function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (_Object$getOwnPropertyDescriptors) { _Object$defineProperties(target, _Object$getOwnPropertyDescriptors(source)); } else { var _context3; _forEachInstanceProperty(_context3 = ownKeys(Object(source))).call(_context3, function (key) { _Object$defineProperty(target, key, _Object$getOwnPropertyDescriptor(source, key)); }); } } return target; }

const registry = _.default.registry;

/**
 *
 */
class Cli {
  constructor() {
    (0, _defineProperty2.default)(this, "_repl", new _repl.default(this));
    (0, _defineProperty2.default)(this, "_conn", new _.Connection());
    (0, _defineProperty2.default)(this, "_connName", undefined);
    (0, _defineProperty2.default)(this, "_outputEnabled", true);
    (0, _defineProperty2.default)(this, "_defaultLoginUrl", undefined);
  }

  /**
   *
   */
  readCommand() {
    return new _commander.Command().option('-u, --username [username]', 'Salesforce username').option('-p, --password [password]', 'Salesforce password (and security token, if available)').option('-c, --connection [connection]', 'Connection name stored in connection registry').option('-l, --loginUrl [loginUrl]', 'Salesforce login url').option('--sandbox', 'Login to Salesforce sandbox').option('-e, --evalScript [evalScript]', 'Script to evaluate').version(_VERSION.default).parse(process.argv);
  }

  async start() {
    const program = this.readCommand();
    this._outputEnabled = !program.evalScript;

    try {
      await this.connect(program);

      if (program.evalScript) {
        this._repl.start({
          interactive: false,
          evalScript: program.evalScript
        });
      } else {
        this._repl.start();
      }
    } catch (err) {
      console.error(err);
      process.exit();
    }
  }

  getCurrentConnection() {
    return this._conn;
  }

  print(...args) {
    if (this._outputEnabled) {
      console.log(...args);
    }
  }

  saveCurrentConnection() {
    if (this._connName) {
      const conn = this._conn;
      const connName = this._connName;
      const connConfig = {
        oauth2: conn.oauth2 ? {
          clientId: conn.oauth2.clientId || undefined,
          clientSecret: conn.oauth2.clientSecret || undefined,
          redirectUri: conn.oauth2.redirectUri || undefined,
          loginUrl: conn.oauth2.loginUrl || undefined
        } : undefined,
        accessToken: conn.accessToken || undefined,
        instanceUrl: conn.instanceUrl || undefined,
        refreshToken: conn.refreshToken || undefined
      };
      registry.saveConnectionConfig(connName, connConfig);
    }
  }

  setLoginServer(loginServer) {
    if (!loginServer) {
      return;
    }

    if (loginServer === 'production') {
      this._defaultLoginUrl = 'https://login.salesforce.com';
    } else if (loginServer === 'sandbox') {
      this._defaultLoginUrl = 'https://test.salesforce.com';
    } else if ((0, _indexOf.default)(loginServer).call(loginServer, 'https://') !== 0) {
      this._defaultLoginUrl = 'https://' + loginServer;
    } else {
      this._defaultLoginUrl = loginServer;
    }

    this.print(`Using "${this._defaultLoginUrl}" as default login URL.`);
  }
  /**
   *
   */


  async connect(options) {
    const loginServer = options.loginUrl ? options.loginUrl : options.sandbox ? 'sandbox' : null;
    this.setLoginServer(loginServer);
    this._connName = options.connection;
    let connConfig = await registry.getConnectionConfig(options.connection);
    let username = options.username;

    if (!connConfig) {
      connConfig = {};

      if (this._defaultLoginUrl) {
        connConfig.loginUrl = this._defaultLoginUrl;
      }

      username = username || options.connection;
    }

    this._conn = new _.Connection(connConfig);
    const password = options.password;

    if (username) {
      await this.startPasswordAuth(username, password);
      this.saveCurrentConnection();
    } else {
      if (this._connName && this._conn.accessToken) {
        this._conn.on('refresh', () => {
          this.print('Refreshing access token ... ');
          this.saveCurrentConnection();
        });

        try {
          const identity = await this._conn.identity();
          this.print(`Logged in as : ${identity.username}`);
        } catch (err) {
          this.print(err.message);

          if (this._conn.oauth2) {
            throw new Error('Please re-authorize connection.');
          } else {
            await this.startPasswordAuth(this._connName);
          }
        }
      }
    }
  }
  /**
   *
   */


  async startPasswordAuth(username, password) {
    try {
      await this.loginByPassword(username, password, 2);
    } catch (err) {
      if (err.message === 'canceled') {
        console.error('Password authentication canceled: Not logged in');
      } else {
        throw err;
      }
    }
  }
  /**
   *
   */


  async loginByPassword(username, password, retryCount) {
    if (password === '') {
      throw new Error('canceled');
    }

    if (password == null) {
      const pass = await this.promptPassword('Password: ');
      return this.loginByPassword(username, pass, retryCount);
    }

    try {
      const result = await this._conn.login(username, password);
      this.print(`Logged in as : ${username}`);
      return result;
    } catch (err) {
      console.error(err.message);

      if (retryCount > 0) {
        return this.loginByPassword(username, undefined, retryCount - 1);
      } else {
        throw new Error('canceled');
      }
    }
  }
  /**
   *
   */


  disconnect(connName) {
    const name = connName || this._connName;

    if (name && registry.getConnectionConfig(name)) {
      registry.removeConnectionConfig(name);
      this.print(`Disconnect connection '${name}'`);
    }

    this._connName = undefined;
    this._conn = new _.Connection();
  }
  /**
   *
   */


  async authorize(clientName) {
    const name = clientName || 'default';
    var oauth2Config = await registry.getClientConfig(name);

    if (!oauth2Config || !oauth2Config.clientId) {
      if (name === 'default' || name === 'sandbox') {
        this.print('No client information registered. Downloading JSforce default client information...');
        return this.downloadDefaultClientInfo(name);
      }

      throw new Error(`No OAuth2 client information registered : '${name}'. Please register client info first.`);
    }

    const oauth2 = new _.OAuth2(oauth2Config);

    const verifier = _base64url.default.encode(_crypto.default.randomBytes(32));

    const challenge = _base64url.default.encode(_crypto.default.createHash('sha256').update(verifier).digest());

    const state = _base64url.default.encode(_crypto.default.randomBytes(32));

    const authzUrl = oauth2.getAuthorizationUrl({
      code_challenge: challenge,
      state
    });
    this.print('Opening authorization page in browser...');
    this.print(`URL: ${authzUrl}`);
    this.openUrl(authzUrl);
    const params = await this.waitCallback(oauth2Config.redirectUri, state);

    if (!params.code) {
      throw new Error('No authorization code returned.');
    }

    if (params.state !== state) {
      throw new Error('Invalid state parameter returned.');
    }

    this._conn = new _.Connection({
      oauth2
    });
    this.print('Received authorization code. Please close the opened browser window.');
    await this._conn.authorize(params.code, {
      code_verifier: verifier
    });
    this.print('Authorized. Fetching user info...');
    const identity = await this._conn.identity();
    this.print(`Logged in as : ${identity.username}`);
    this._connName = identity.username;
    this.saveCurrentConnection();
  }
  /**
   *
   */


  async downloadDefaultClientInfo(clientName) {
    const configUrl = 'https://jsforce.github.io/client-config/default.json';
    const res = await new _promise.default((resolve, reject) => {
      (0, _request.default)({
        method: 'GET',
        url: configUrl
      }).on('complete', resolve).on('error', reject);
    });
    const clientConfig = JSON.parse(res.body);

    if (clientName === 'sandbox') {
      clientConfig.loginUrl = 'https://test.salesforce.com';
    }

    await registry.registerClientConfig(clientName, clientConfig);
    this.print('Client information downloaded successfully.');
    return this.authorize(clientName);
  }

  async waitCallback(serverUrl, state) {
    if (serverUrl && (0, _indexOf.default)(serverUrl).call(serverUrl, 'http://localhost:') === 0) {
      return new _promise.default((resolve, reject) => {
        const server = _http.default.createServer((req, res) => {
          if (!req.url) {
            return;
          }

          const qparams = _url.default.parse(req.url, true).query;

          res.writeHead(200, {
            'Content-Type': 'text/html'
          });
          res.write('<html><script>location.href="about:blank";</script></html>');
          res.end();

          if (qparams.error) {
            reject(new Error(qparams.error));
          } else {
            resolve(qparams);
          }

          server.close();
          req.connection.end();
          req.connection.destroy();
        });

        const port = Number(_url.default.parse(serverUrl).port);
        server.listen(port, 'localhost');
      });
    } else {
      const code = await this.promptMessage('Copy & paste authz code passed in redirected URL: ');
      return {
        code: decodeURIComponent(code),
        state
      };
    }
  }
  /**
   *
   */


  async register(clientName, clientConfig) {
    var _context;

    const name = clientName || 'default';
    const prompts = {
      clientId: 'Input client ID : ',
      clientSecret: 'Input client secret (optional) : ',
      redirectUri: 'Input redirect URI : ',
      loginUrl: 'Input login URL (default is https://login.salesforce.com) : '
    };
    const registered = await registry.getClientConfig(name);

    if (registered) {
      const msg = `Client '${name}' is already registered. Are you sure you want to override ? [yN] : `;
      const ok = await this.promptConfirm(msg);

      if (!ok) {
        throw new Error('Registration canceled.');
      }
    }

    clientConfig = await (0, _reduce.default)(_context = (0, _keys.default)(prompts)).call(_context, async (promise, name) => {
      const cconfig = await promise;
      const promptName = name;
      const message = prompts[promptName];

      if (!cconfig[promptName]) {
        const value = await this.promptMessage(message);

        if (value) {
          return _objectSpread(_objectSpread({}, cconfig), {}, {
            [promptName]: value
          });
        }
      }

      return cconfig;
    }, _promise.default.resolve(clientConfig));
    await registry.registerClientConfig(name, clientConfig);
    this.print('Client registered successfully.');
  }
  /**
   *
   */


  async listConnections() {
    const names = await registry.getConnectionNames();

    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      this.print((name === this._connName ? '* ' : '  ') + name);
    }
  }
  /**
   *
   */


  async getConnectionNames() {
    return registry.getConnectionNames();
  }
  /**
   *
   */


  async getClientNames() {
    return registry.getClientNames();
  }
  /**
   *
   */


  async prompt(type, message) {
    this._repl.pause();

    const answer = await _inquirer.default.prompt([{
      type,
      name: 'value',
      message
    }]);

    this._repl.resume();

    return answer.value;
  }
  /**
   *
   */


  async promptMessage(message) {
    return this.prompt('input', message);
  }

  async promptPassword(message) {
    return this.prompt('password', message);
  }
  /**
   *
   */


  async promptConfirm(message) {
    return this.prompt('confirm', message);
  }
  /**
   *
   */


  openUrl(url) {
    (0, _open.default)(url);
  }
  /**
   *
   */


  openUrlUsingSession(url) {
    let frontdoorUrl = `${this._conn.instanceUrl}/secur/frontdoor.jsp?sid=${this._conn.accessToken}`;

    if (url) {
      frontdoorUrl += '&retURL=' + encodeURIComponent(url);
    }

    this.openUrl(frontdoorUrl);
  }

}
/* ------------------------------------------------------------------------- */


exports.Cli = Cli;
const cli = new Cli();
var _default = cli;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGkvY2xpLnRzIl0sIm5hbWVzIjpbInJlZ2lzdHJ5IiwianNmb3JjZSIsIkNsaSIsIlJlcGwiLCJDb25uZWN0aW9uIiwidW5kZWZpbmVkIiwicmVhZENvbW1hbmQiLCJDb21tYW5kIiwib3B0aW9uIiwidmVyc2lvbiIsInBhcnNlIiwicHJvY2VzcyIsImFyZ3YiLCJzdGFydCIsInByb2dyYW0iLCJfb3V0cHV0RW5hYmxlZCIsImV2YWxTY3JpcHQiLCJjb25uZWN0IiwiX3JlcGwiLCJpbnRlcmFjdGl2ZSIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsImV4aXQiLCJnZXRDdXJyZW50Q29ubmVjdGlvbiIsIl9jb25uIiwicHJpbnQiLCJhcmdzIiwibG9nIiwic2F2ZUN1cnJlbnRDb25uZWN0aW9uIiwiX2Nvbm5OYW1lIiwiY29ubiIsImNvbm5OYW1lIiwiY29ubkNvbmZpZyIsIm9hdXRoMiIsImNsaWVudElkIiwiY2xpZW50U2VjcmV0IiwicmVkaXJlY3RVcmkiLCJsb2dpblVybCIsImFjY2Vzc1Rva2VuIiwiaW5zdGFuY2VVcmwiLCJyZWZyZXNoVG9rZW4iLCJzYXZlQ29ubmVjdGlvbkNvbmZpZyIsInNldExvZ2luU2VydmVyIiwibG9naW5TZXJ2ZXIiLCJfZGVmYXVsdExvZ2luVXJsIiwib3B0aW9ucyIsInNhbmRib3giLCJjb25uZWN0aW9uIiwiZ2V0Q29ubmVjdGlvbkNvbmZpZyIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJzdGFydFBhc3N3b3JkQXV0aCIsIm9uIiwiaWRlbnRpdHkiLCJtZXNzYWdlIiwiRXJyb3IiLCJsb2dpbkJ5UGFzc3dvcmQiLCJyZXRyeUNvdW50IiwicGFzcyIsInByb21wdFBhc3N3b3JkIiwicmVzdWx0IiwibG9naW4iLCJkaXNjb25uZWN0IiwibmFtZSIsInJlbW92ZUNvbm5lY3Rpb25Db25maWciLCJhdXRob3JpemUiLCJjbGllbnROYW1lIiwib2F1dGgyQ29uZmlnIiwiZ2V0Q2xpZW50Q29uZmlnIiwiZG93bmxvYWREZWZhdWx0Q2xpZW50SW5mbyIsIk9BdXRoMiIsInZlcmlmaWVyIiwiYmFzZTY0dXJsIiwiZW5jb2RlIiwiY3J5cHRvIiwicmFuZG9tQnl0ZXMiLCJjaGFsbGVuZ2UiLCJjcmVhdGVIYXNoIiwidXBkYXRlIiwiZGlnZXN0Iiwic3RhdGUiLCJhdXRoelVybCIsImdldEF1dGhvcml6YXRpb25VcmwiLCJjb2RlX2NoYWxsZW5nZSIsIm9wZW5VcmwiLCJwYXJhbXMiLCJ3YWl0Q2FsbGJhY2siLCJjb2RlIiwiY29kZV92ZXJpZmllciIsImNvbmZpZ1VybCIsInJlcyIsInJlc29sdmUiLCJyZWplY3QiLCJtZXRob2QiLCJ1cmwiLCJjbGllbnRDb25maWciLCJKU09OIiwiYm9keSIsInJlZ2lzdGVyQ2xpZW50Q29uZmlnIiwic2VydmVyVXJsIiwic2VydmVyIiwiaHR0cCIsImNyZWF0ZVNlcnZlciIsInJlcSIsInFwYXJhbXMiLCJxdWVyeSIsIndyaXRlSGVhZCIsIndyaXRlIiwiZW5kIiwiY2xvc2UiLCJkZXN0cm95IiwicG9ydCIsIk51bWJlciIsImxpc3RlbiIsInByb21wdE1lc3NhZ2UiLCJkZWNvZGVVUklDb21wb25lbnQiLCJyZWdpc3RlciIsInByb21wdHMiLCJyZWdpc3RlcmVkIiwibXNnIiwib2siLCJwcm9tcHRDb25maXJtIiwicHJvbWlzZSIsImNjb25maWciLCJwcm9tcHROYW1lIiwidmFsdWUiLCJsaXN0Q29ubmVjdGlvbnMiLCJuYW1lcyIsImdldENvbm5lY3Rpb25OYW1lcyIsImkiLCJsZW5ndGgiLCJnZXRDbGllbnROYW1lcyIsInByb21wdCIsInR5cGUiLCJwYXVzZSIsImFuc3dlciIsImlucXVpcmVyIiwicmVzdW1lIiwib3BlblVybFVzaW5nU2Vzc2lvbiIsImZyb250ZG9vclVybCIsImVuY29kZVVSSUNvbXBvbmVudCIsImNsaSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBSUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7OztBQUlBLE1BQU1BLFFBQVEsR0FBR0MsVUFBUUQsUUFBekI7O0FBV0E7QUFDQTtBQUNBO0FBQ08sTUFBTUUsR0FBTixDQUFVO0FBQUE7QUFBQSxpREFDRCxJQUFJQyxhQUFKLENBQVMsSUFBVCxDQURDO0FBQUEsaURBRUssSUFBSUMsWUFBSixFQUZMO0FBQUEscURBR2lCQyxTQUhqQjtBQUFBLDBEQUlXLElBSlg7QUFBQSw0REFLd0JBLFNBTHhCO0FBQUE7O0FBT2Y7QUFDRjtBQUNBO0FBQ0VDLEVBQUFBLFdBQVcsR0FBZTtBQUN4QixXQUFPLElBQUlDLGtCQUFKLEdBQ0pDLE1BREksQ0FDRywyQkFESCxFQUNnQyxxQkFEaEMsRUFFSkEsTUFGSSxDQUdILDJCQUhHLEVBSUgsd0RBSkcsRUFNSkEsTUFOSSxDQU9ILCtCQVBHLEVBUUgsK0NBUkcsRUFVSkEsTUFWSSxDQVVHLDJCQVZILEVBVWdDLHNCQVZoQyxFQVdKQSxNQVhJLENBV0csV0FYSCxFQVdnQiw2QkFYaEIsRUFZSkEsTUFaSSxDQVlHLCtCQVpILEVBWW9DLG9CQVpwQyxFQWFKQyxPQWJJLENBYUlBLGdCQWJKLEVBY0pDLEtBZEksQ0FjRUMsT0FBTyxDQUFDQyxJQWRWLENBQVA7QUFlRDs7QUFFRCxRQUFNQyxLQUFOLEdBQWM7QUFDWixVQUFNQyxPQUFPLEdBQUcsS0FBS1IsV0FBTCxFQUFoQjtBQUNBLFNBQUtTLGNBQUwsR0FBc0IsQ0FBQ0QsT0FBTyxDQUFDRSxVQUEvQjs7QUFDQSxRQUFJO0FBQ0YsWUFBTSxLQUFLQyxPQUFMLENBQWFILE9BQWIsQ0FBTjs7QUFDQSxVQUFJQSxPQUFPLENBQUNFLFVBQVosRUFBd0I7QUFDdEIsYUFBS0UsS0FBTCxDQUFXTCxLQUFYLENBQWlCO0FBQ2ZNLFVBQUFBLFdBQVcsRUFBRSxLQURFO0FBRWZILFVBQUFBLFVBQVUsRUFBRUYsT0FBTyxDQUFDRTtBQUZMLFNBQWpCO0FBSUQsT0FMRCxNQUtPO0FBQ0wsYUFBS0UsS0FBTCxDQUFXTCxLQUFYO0FBQ0Q7QUFDRixLQVZELENBVUUsT0FBT08sR0FBUCxFQUFZO0FBQ1pDLE1BQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjRixHQUFkO0FBQ0FULE1BQUFBLE9BQU8sQ0FBQ1ksSUFBUjtBQUNEO0FBQ0Y7O0FBRURDLEVBQUFBLG9CQUFvQixHQUFHO0FBQ3JCLFdBQU8sS0FBS0MsS0FBWjtBQUNEOztBQUVEQyxFQUFBQSxLQUFLLENBQUMsR0FBR0MsSUFBSixFQUFpQjtBQUNwQixRQUFJLEtBQUtaLGNBQVQsRUFBeUI7QUFDdkJNLE1BQUFBLE9BQU8sQ0FBQ08sR0FBUixDQUFZLEdBQUdELElBQWY7QUFDRDtBQUNGOztBQUVERSxFQUFBQSxxQkFBcUIsR0FBRztBQUN0QixRQUFJLEtBQUtDLFNBQVQsRUFBb0I7QUFDbEIsWUFBTUMsSUFBSSxHQUFHLEtBQUtOLEtBQWxCO0FBQ0EsWUFBTU8sUUFBUSxHQUFHLEtBQUtGLFNBQXRCO0FBQ0EsWUFBTUcsVUFBVSxHQUFHO0FBQ2pCQyxRQUFBQSxNQUFNLEVBQUVILElBQUksQ0FBQ0csTUFBTCxHQUNKO0FBQ0VDLFVBQUFBLFFBQVEsRUFBRUosSUFBSSxDQUFDRyxNQUFMLENBQVlDLFFBQVosSUFBd0I5QixTQURwQztBQUVFK0IsVUFBQUEsWUFBWSxFQUFFTCxJQUFJLENBQUNHLE1BQUwsQ0FBWUUsWUFBWixJQUE0Qi9CLFNBRjVDO0FBR0VnQyxVQUFBQSxXQUFXLEVBQUVOLElBQUksQ0FBQ0csTUFBTCxDQUFZRyxXQUFaLElBQTJCaEMsU0FIMUM7QUFJRWlDLFVBQUFBLFFBQVEsRUFBRVAsSUFBSSxDQUFDRyxNQUFMLENBQVlJLFFBQVosSUFBd0JqQztBQUpwQyxTQURJLEdBT0pBLFNBUmE7QUFTakJrQyxRQUFBQSxXQUFXLEVBQUVSLElBQUksQ0FBQ1EsV0FBTCxJQUFvQmxDLFNBVGhCO0FBVWpCbUMsUUFBQUEsV0FBVyxFQUFFVCxJQUFJLENBQUNTLFdBQUwsSUFBb0JuQyxTQVZoQjtBQVdqQm9DLFFBQUFBLFlBQVksRUFBRVYsSUFBSSxDQUFDVSxZQUFMLElBQXFCcEM7QUFYbEIsT0FBbkI7QUFhQUwsTUFBQUEsUUFBUSxDQUFDMEMsb0JBQVQsQ0FBOEJWLFFBQTlCLEVBQXdDQyxVQUF4QztBQUNEO0FBQ0Y7O0FBRURVLEVBQUFBLGNBQWMsQ0FBQ0MsV0FBRCxFQUFnQztBQUM1QyxRQUFJLENBQUNBLFdBQUwsRUFBa0I7QUFDaEI7QUFDRDs7QUFDRCxRQUFJQSxXQUFXLEtBQUssWUFBcEIsRUFBa0M7QUFDaEMsV0FBS0MsZ0JBQUwsR0FBd0IsOEJBQXhCO0FBQ0QsS0FGRCxNQUVPLElBQUlELFdBQVcsS0FBSyxTQUFwQixFQUErQjtBQUNwQyxXQUFLQyxnQkFBTCxHQUF3Qiw2QkFBeEI7QUFDRCxLQUZNLE1BRUEsSUFBSSxzQkFBQUQsV0FBVyxNQUFYLENBQUFBLFdBQVcsRUFBUyxVQUFULENBQVgsS0FBb0MsQ0FBeEMsRUFBMkM7QUFDaEQsV0FBS0MsZ0JBQUwsR0FBd0IsYUFBYUQsV0FBckM7QUFDRCxLQUZNLE1BRUE7QUFDTCxXQUFLQyxnQkFBTCxHQUF3QkQsV0FBeEI7QUFDRDs7QUFDRCxTQUFLbEIsS0FBTCxDQUFZLFVBQVMsS0FBS21CLGdCQUFpQix5QkFBM0M7QUFDRDtBQUVEO0FBQ0Y7QUFDQTs7O0FBQ0UsUUFBTTVCLE9BQU4sQ0FBYzZCLE9BQWQsRUFNRztBQUNELFVBQU1GLFdBQVcsR0FBR0UsT0FBTyxDQUFDUixRQUFSLEdBQ2hCUSxPQUFPLENBQUNSLFFBRFEsR0FFaEJRLE9BQU8sQ0FBQ0MsT0FBUixHQUNBLFNBREEsR0FFQSxJQUpKO0FBS0EsU0FBS0osY0FBTCxDQUFvQkMsV0FBcEI7QUFDQSxTQUFLZCxTQUFMLEdBQWlCZ0IsT0FBTyxDQUFDRSxVQUF6QjtBQUNBLFFBQUlmLFVBQVUsR0FBRyxNQUFNakMsUUFBUSxDQUFDaUQsbUJBQVQsQ0FBNkJILE9BQU8sQ0FBQ0UsVUFBckMsQ0FBdkI7QUFDQSxRQUFJRSxRQUFRLEdBQUdKLE9BQU8sQ0FBQ0ksUUFBdkI7O0FBQ0EsUUFBSSxDQUFDakIsVUFBTCxFQUFpQjtBQUNmQSxNQUFBQSxVQUFVLEdBQUcsRUFBYjs7QUFDQSxVQUFJLEtBQUtZLGdCQUFULEVBQTJCO0FBQ3pCWixRQUFBQSxVQUFVLENBQUNLLFFBQVgsR0FBc0IsS0FBS08sZ0JBQTNCO0FBQ0Q7O0FBQ0RLLE1BQUFBLFFBQVEsR0FBR0EsUUFBUSxJQUFJSixPQUFPLENBQUNFLFVBQS9CO0FBQ0Q7O0FBQ0QsU0FBS3ZCLEtBQUwsR0FBYSxJQUFJckIsWUFBSixDQUFlNkIsVUFBZixDQUFiO0FBQ0EsVUFBTWtCLFFBQVEsR0FBR0wsT0FBTyxDQUFDSyxRQUF6Qjs7QUFDQSxRQUFJRCxRQUFKLEVBQWM7QUFDWixZQUFNLEtBQUtFLGlCQUFMLENBQXVCRixRQUF2QixFQUFpQ0MsUUFBakMsQ0FBTjtBQUNBLFdBQUt0QixxQkFBTDtBQUNELEtBSEQsTUFHTztBQUNMLFVBQUksS0FBS0MsU0FBTCxJQUFrQixLQUFLTCxLQUFMLENBQVdjLFdBQWpDLEVBQThDO0FBQzVDLGFBQUtkLEtBQUwsQ0FBVzRCLEVBQVgsQ0FBYyxTQUFkLEVBQXlCLE1BQU07QUFDN0IsZUFBSzNCLEtBQUwsQ0FBVyw4QkFBWDtBQUNBLGVBQUtHLHFCQUFMO0FBQ0QsU0FIRDs7QUFJQSxZQUFJO0FBQ0YsZ0JBQU15QixRQUFRLEdBQUcsTUFBTSxLQUFLN0IsS0FBTCxDQUFXNkIsUUFBWCxFQUF2QjtBQUNBLGVBQUs1QixLQUFMLENBQVksa0JBQWlCNEIsUUFBUSxDQUFDSixRQUFTLEVBQS9DO0FBQ0QsU0FIRCxDQUdFLE9BQU85QixHQUFQLEVBQVk7QUFDWixlQUFLTSxLQUFMLENBQVdOLEdBQUcsQ0FBQ21DLE9BQWY7O0FBQ0EsY0FBSSxLQUFLOUIsS0FBTCxDQUFXUyxNQUFmLEVBQXVCO0FBQ3JCLGtCQUFNLElBQUlzQixLQUFKLENBQVUsaUNBQVYsQ0FBTjtBQUNELFdBRkQsTUFFTztBQUNMLGtCQUFNLEtBQUtKLGlCQUFMLENBQXVCLEtBQUt0QixTQUE1QixDQUFOO0FBQ0Q7QUFDRjtBQUNGO0FBQ0Y7QUFDRjtBQUVEO0FBQ0Y7QUFDQTs7O0FBQ0UsUUFBTXNCLGlCQUFOLENBQXdCRixRQUF4QixFQUEwQ0MsUUFBMUMsRUFBNkQ7QUFDM0QsUUFBSTtBQUNGLFlBQU0sS0FBS00sZUFBTCxDQUFxQlAsUUFBckIsRUFBK0JDLFFBQS9CLEVBQXlDLENBQXpDLENBQU47QUFDRCxLQUZELENBRUUsT0FBTy9CLEdBQVAsRUFBWTtBQUNaLFVBQUlBLEdBQUcsQ0FBQ21DLE9BQUosS0FBZ0IsVUFBcEIsRUFBZ0M7QUFDOUJsQyxRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxpREFBZDtBQUNELE9BRkQsTUFFTztBQUNMLGNBQU1GLEdBQU47QUFDRDtBQUNGO0FBQ0Y7QUFFRDtBQUNGO0FBQ0E7OztBQUNFLFFBQU1xQyxlQUFOLENBQ0VQLFFBREYsRUFFRUMsUUFGRixFQUdFTyxVQUhGLEVBSTJCO0FBQ3pCLFFBQUlQLFFBQVEsS0FBSyxFQUFqQixFQUFxQjtBQUNuQixZQUFNLElBQUlLLEtBQUosQ0FBVSxVQUFWLENBQU47QUFDRDs7QUFDRCxRQUFJTCxRQUFRLElBQUksSUFBaEIsRUFBc0I7QUFDcEIsWUFBTVEsSUFBSSxHQUFHLE1BQU0sS0FBS0MsY0FBTCxDQUFvQixZQUFwQixDQUFuQjtBQUNBLGFBQU8sS0FBS0gsZUFBTCxDQUFxQlAsUUFBckIsRUFBK0JTLElBQS9CLEVBQXFDRCxVQUFyQyxDQUFQO0FBQ0Q7O0FBQ0QsUUFBSTtBQUNGLFlBQU1HLE1BQU0sR0FBRyxNQUFNLEtBQUtwQyxLQUFMLENBQVdxQyxLQUFYLENBQWlCWixRQUFqQixFQUEyQkMsUUFBM0IsQ0FBckI7QUFDQSxXQUFLekIsS0FBTCxDQUFZLGtCQUFpQndCLFFBQVMsRUFBdEM7QUFDQSxhQUFPVyxNQUFQO0FBQ0QsS0FKRCxDQUlFLE9BQU96QyxHQUFQLEVBQVk7QUFDWkMsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWNGLEdBQUcsQ0FBQ21DLE9BQWxCOztBQUNBLFVBQUlHLFVBQVUsR0FBRyxDQUFqQixFQUFvQjtBQUNsQixlQUFPLEtBQUtELGVBQUwsQ0FBcUJQLFFBQXJCLEVBQStCN0MsU0FBL0IsRUFBMENxRCxVQUFVLEdBQUcsQ0FBdkQsQ0FBUDtBQUNELE9BRkQsTUFFTztBQUNMLGNBQU0sSUFBSUYsS0FBSixDQUFVLFVBQVYsQ0FBTjtBQUNEO0FBQ0Y7QUFDRjtBQUVEO0FBQ0Y7QUFDQTs7O0FBQ0VPLEVBQUFBLFVBQVUsQ0FBQy9CLFFBQUQsRUFBb0I7QUFDNUIsVUFBTWdDLElBQUksR0FBR2hDLFFBQVEsSUFBSSxLQUFLRixTQUE5Qjs7QUFDQSxRQUFJa0MsSUFBSSxJQUFJaEUsUUFBUSxDQUFDaUQsbUJBQVQsQ0FBNkJlLElBQTdCLENBQVosRUFBZ0Q7QUFDOUNoRSxNQUFBQSxRQUFRLENBQUNpRSxzQkFBVCxDQUFnQ0QsSUFBaEM7QUFDQSxXQUFLdEMsS0FBTCxDQUFZLDBCQUF5QnNDLElBQUssR0FBMUM7QUFDRDs7QUFDRCxTQUFLbEMsU0FBTCxHQUFpQnpCLFNBQWpCO0FBQ0EsU0FBS29CLEtBQUwsR0FBYSxJQUFJckIsWUFBSixFQUFiO0FBQ0Q7QUFFRDtBQUNGO0FBQ0E7OztBQUNFLFFBQU04RCxTQUFOLENBQWdCQyxVQUFoQixFQUFvQztBQUNsQyxVQUFNSCxJQUFJLEdBQUdHLFVBQVUsSUFBSSxTQUEzQjtBQUNBLFFBQUlDLFlBQVksR0FBRyxNQUFNcEUsUUFBUSxDQUFDcUUsZUFBVCxDQUF5QkwsSUFBekIsQ0FBekI7O0FBQ0EsUUFBSSxDQUFDSSxZQUFELElBQWlCLENBQUNBLFlBQVksQ0FBQ2pDLFFBQW5DLEVBQTZDO0FBQzNDLFVBQUk2QixJQUFJLEtBQUssU0FBVCxJQUFzQkEsSUFBSSxLQUFLLFNBQW5DLEVBQThDO0FBQzVDLGFBQUt0QyxLQUFMLENBQ0UscUZBREY7QUFHQSxlQUFPLEtBQUs0Qyx5QkFBTCxDQUErQk4sSUFBL0IsQ0FBUDtBQUNEOztBQUNELFlBQU0sSUFBSVIsS0FBSixDQUNILDhDQUE2Q1EsSUFBSyx1Q0FEL0MsQ0FBTjtBQUdEOztBQUNELFVBQU05QixNQUFNLEdBQUcsSUFBSXFDLFFBQUosQ0FBV0gsWUFBWCxDQUFmOztBQUNBLFVBQU1JLFFBQVEsR0FBR0MsbUJBQVVDLE1BQVYsQ0FBaUJDLGdCQUFPQyxXQUFQLENBQW1CLEVBQW5CLENBQWpCLENBQWpCOztBQUNBLFVBQU1DLFNBQVMsR0FBR0osbUJBQVVDLE1BQVYsQ0FDaEJDLGdCQUFPRyxVQUFQLENBQWtCLFFBQWxCLEVBQTRCQyxNQUE1QixDQUFtQ1AsUUFBbkMsRUFBNkNRLE1BQTdDLEVBRGdCLENBQWxCOztBQUdBLFVBQU1DLEtBQUssR0FBR1IsbUJBQVVDLE1BQVYsQ0FBaUJDLGdCQUFPQyxXQUFQLENBQW1CLEVBQW5CLENBQWpCLENBQWQ7O0FBQ0EsVUFBTU0sUUFBUSxHQUFHaEQsTUFBTSxDQUFDaUQsbUJBQVAsQ0FBMkI7QUFDMUNDLE1BQUFBLGNBQWMsRUFBRVAsU0FEMEI7QUFFMUNJLE1BQUFBO0FBRjBDLEtBQTNCLENBQWpCO0FBSUEsU0FBS3ZELEtBQUwsQ0FBVywwQ0FBWDtBQUNBLFNBQUtBLEtBQUwsQ0FBWSxRQUFPd0QsUUFBUyxFQUE1QjtBQUNBLFNBQUtHLE9BQUwsQ0FBYUgsUUFBYjtBQUNBLFVBQU1JLE1BQU0sR0FBRyxNQUFNLEtBQUtDLFlBQUwsQ0FBa0JuQixZQUFZLENBQUMvQixXQUEvQixFQUE0QzRDLEtBQTVDLENBQXJCOztBQUNBLFFBQUksQ0FBQ0ssTUFBTSxDQUFDRSxJQUFaLEVBQWtCO0FBQ2hCLFlBQU0sSUFBSWhDLEtBQUosQ0FBVSxpQ0FBVixDQUFOO0FBQ0Q7O0FBQ0QsUUFBSThCLE1BQU0sQ0FBQ0wsS0FBUCxLQUFpQkEsS0FBckIsRUFBNEI7QUFDMUIsWUFBTSxJQUFJekIsS0FBSixDQUFVLG1DQUFWLENBQU47QUFDRDs7QUFDRCxTQUFLL0IsS0FBTCxHQUFhLElBQUlyQixZQUFKLENBQWU7QUFBRThCLE1BQUFBO0FBQUYsS0FBZixDQUFiO0FBQ0EsU0FBS1IsS0FBTCxDQUNFLHNFQURGO0FBR0EsVUFBTSxLQUFLRCxLQUFMLENBQVd5QyxTQUFYLENBQXFCb0IsTUFBTSxDQUFDRSxJQUE1QixFQUFrQztBQUFFQyxNQUFBQSxhQUFhLEVBQUVqQjtBQUFqQixLQUFsQyxDQUFOO0FBQ0EsU0FBSzlDLEtBQUwsQ0FBVyxtQ0FBWDtBQUNBLFVBQU00QixRQUFRLEdBQUcsTUFBTSxLQUFLN0IsS0FBTCxDQUFXNkIsUUFBWCxFQUF2QjtBQUNBLFNBQUs1QixLQUFMLENBQVksa0JBQWlCNEIsUUFBUSxDQUFDSixRQUFTLEVBQS9DO0FBQ0EsU0FBS3BCLFNBQUwsR0FBaUJ3QixRQUFRLENBQUNKLFFBQTFCO0FBQ0EsU0FBS3JCLHFCQUFMO0FBQ0Q7QUFFRDtBQUNGO0FBQ0E7OztBQUNFLFFBQU15Qyx5QkFBTixDQUFnQ0gsVUFBaEMsRUFBbUU7QUFDakUsVUFBTXVCLFNBQVMsR0FBRyxzREFBbEI7QUFDQSxVQUFNQyxHQUFxQixHQUFHLE1BQU0scUJBQVksQ0FBQ0MsT0FBRCxFQUFVQyxNQUFWLEtBQXFCO0FBQ25FLDRCQUFRO0FBQUVDLFFBQUFBLE1BQU0sRUFBRSxLQUFWO0FBQWlCQyxRQUFBQSxHQUFHLEVBQUVMO0FBQXRCLE9BQVIsRUFDR3JDLEVBREgsQ0FDTSxVQUROLEVBQ2tCdUMsT0FEbEIsRUFFR3ZDLEVBRkgsQ0FFTSxPQUZOLEVBRWV3QyxNQUZmO0FBR0QsS0FKbUMsQ0FBcEM7QUFLQSxVQUFNRyxZQUFZLEdBQUdDLElBQUksQ0FBQ3ZGLEtBQUwsQ0FBV2lGLEdBQUcsQ0FBQ08sSUFBZixDQUFyQjs7QUFDQSxRQUFJL0IsVUFBVSxLQUFLLFNBQW5CLEVBQThCO0FBQzVCNkIsTUFBQUEsWUFBWSxDQUFDMUQsUUFBYixHQUF3Qiw2QkFBeEI7QUFDRDs7QUFDRCxVQUFNdEMsUUFBUSxDQUFDbUcsb0JBQVQsQ0FBOEJoQyxVQUE5QixFQUEwQzZCLFlBQTFDLENBQU47QUFDQSxTQUFLdEUsS0FBTCxDQUFXLDZDQUFYO0FBQ0EsV0FBTyxLQUFLd0MsU0FBTCxDQUFlQyxVQUFmLENBQVA7QUFDRDs7QUFFRCxRQUFNb0IsWUFBTixDQUNFYSxTQURGLEVBRUVuQixLQUZGLEVBRzRDO0FBQzFDLFFBQUltQixTQUFTLElBQUksc0JBQUFBLFNBQVMsTUFBVCxDQUFBQSxTQUFTLEVBQVMsbUJBQVQsQ0FBVCxLQUEyQyxDQUE1RCxFQUErRDtBQUM3RCxhQUFPLHFCQUFZLENBQUNSLE9BQUQsRUFBVUMsTUFBVixLQUFxQjtBQUN0QyxjQUFNUSxNQUFNLEdBQUdDLGNBQUtDLFlBQUwsQ0FBa0IsQ0FBQ0MsR0FBRCxFQUFNYixHQUFOLEtBQWM7QUFDN0MsY0FBSSxDQUFDYSxHQUFHLENBQUNULEdBQVQsRUFBYztBQUNaO0FBQ0Q7O0FBQ0QsZ0JBQU1VLE9BQU8sR0FBR1YsYUFBSXJGLEtBQUosQ0FBVThGLEdBQUcsQ0FBQ1QsR0FBZCxFQUFtQixJQUFuQixFQUF5QlcsS0FBekM7O0FBQ0FmLFVBQUFBLEdBQUcsQ0FBQ2dCLFNBQUosQ0FBYyxHQUFkLEVBQW1CO0FBQUUsNEJBQWdCO0FBQWxCLFdBQW5CO0FBQ0FoQixVQUFBQSxHQUFHLENBQUNpQixLQUFKLENBQ0UsNERBREY7QUFHQWpCLFVBQUFBLEdBQUcsQ0FBQ2tCLEdBQUo7O0FBQ0EsY0FBSUosT0FBTyxDQUFDbkYsS0FBWixFQUFtQjtBQUNqQnVFLFlBQUFBLE1BQU0sQ0FBQyxJQUFJckMsS0FBSixDQUFVaUQsT0FBTyxDQUFDbkYsS0FBbEIsQ0FBRCxDQUFOO0FBQ0QsV0FGRCxNQUVPO0FBQ0xzRSxZQUFBQSxPQUFPLENBQUNhLE9BQUQsQ0FBUDtBQUNEOztBQUNESixVQUFBQSxNQUFNLENBQUNTLEtBQVA7QUFDQU4sVUFBQUEsR0FBRyxDQUFDeEQsVUFBSixDQUFlNkQsR0FBZjtBQUNBTCxVQUFBQSxHQUFHLENBQUN4RCxVQUFKLENBQWUrRCxPQUFmO0FBQ0QsU0FsQmMsQ0FBZjs7QUFtQkEsY0FBTUMsSUFBSSxHQUFHQyxNQUFNLENBQUNsQixhQUFJckYsS0FBSixDQUFVMEYsU0FBVixFQUFxQlksSUFBdEIsQ0FBbkI7QUFDQVgsUUFBQUEsTUFBTSxDQUFDYSxNQUFQLENBQWNGLElBQWQsRUFBb0IsV0FBcEI7QUFDRCxPQXRCTSxDQUFQO0FBdUJELEtBeEJELE1Bd0JPO0FBQ0wsWUFBTXhCLElBQUksR0FBRyxNQUFNLEtBQUsyQixhQUFMLENBQ2pCLG9EQURpQixDQUFuQjtBQUdBLGFBQU87QUFBRTNCLFFBQUFBLElBQUksRUFBRTRCLGtCQUFrQixDQUFDNUIsSUFBRCxDQUExQjtBQUFrQ1AsUUFBQUE7QUFBbEMsT0FBUDtBQUNEO0FBQ0Y7QUFFRDtBQUNGO0FBQ0E7OztBQUNFLFFBQU1vQyxRQUFOLENBQWVsRCxVQUFmLEVBQStDNkIsWUFBL0MsRUFBMkU7QUFBQTs7QUFDekUsVUFBTWhDLElBQUksR0FBR0csVUFBVSxJQUFJLFNBQTNCO0FBQ0EsVUFBTW1ELE9BQU8sR0FBRztBQUNkbkYsTUFBQUEsUUFBUSxFQUFFLG9CQURJO0FBRWRDLE1BQUFBLFlBQVksRUFBRSxtQ0FGQTtBQUdkQyxNQUFBQSxXQUFXLEVBQUUsdUJBSEM7QUFJZEMsTUFBQUEsUUFBUSxFQUFFO0FBSkksS0FBaEI7QUFNQSxVQUFNaUYsVUFBVSxHQUFHLE1BQU12SCxRQUFRLENBQUNxRSxlQUFULENBQXlCTCxJQUF6QixDQUF6Qjs7QUFDQSxRQUFJdUQsVUFBSixFQUFnQjtBQUNkLFlBQU1DLEdBQUcsR0FBSSxXQUFVeEQsSUFBSyxzRUFBNUI7QUFDQSxZQUFNeUQsRUFBRSxHQUFHLE1BQU0sS0FBS0MsYUFBTCxDQUFtQkYsR0FBbkIsQ0FBakI7O0FBQ0EsVUFBSSxDQUFDQyxFQUFMLEVBQVM7QUFDUCxjQUFNLElBQUlqRSxLQUFKLENBQVUsd0JBQVYsQ0FBTjtBQUNEO0FBQ0Y7O0FBQ0R3QyxJQUFBQSxZQUFZLEdBQUcsTUFBTSxtREFBWXNCLE9BQVosa0JBQTRCLE9BQU9LLE9BQVAsRUFBZ0IzRCxJQUFoQixLQUF5QjtBQUN4RSxZQUFNNEQsT0FBTyxHQUFHLE1BQU1ELE9BQXRCO0FBQ0EsWUFBTUUsVUFBVSxHQUFHN0QsSUFBbkI7QUFDQSxZQUFNVCxPQUFPLEdBQUcrRCxPQUFPLENBQUNPLFVBQUQsQ0FBdkI7O0FBQ0EsVUFBSSxDQUFDRCxPQUFPLENBQUNDLFVBQUQsQ0FBWixFQUEwQjtBQUN4QixjQUFNQyxLQUFLLEdBQUcsTUFBTSxLQUFLWCxhQUFMLENBQW1CNUQsT0FBbkIsQ0FBcEI7O0FBQ0EsWUFBSXVFLEtBQUosRUFBVztBQUNULGlEQUNLRixPQURMO0FBRUUsYUFBQ0MsVUFBRCxHQUFjQztBQUZoQjtBQUlEO0FBQ0Y7O0FBQ0QsYUFBT0YsT0FBUDtBQUNELEtBZG9CLEVBY2xCLGlCQUFRaEMsT0FBUixDQUFnQkksWUFBaEIsQ0Fka0IsQ0FBckI7QUFlQSxVQUFNaEcsUUFBUSxDQUFDbUcsb0JBQVQsQ0FBOEJuQyxJQUE5QixFQUFvQ2dDLFlBQXBDLENBQU47QUFDQSxTQUFLdEUsS0FBTCxDQUFXLGlDQUFYO0FBQ0Q7QUFFRDtBQUNGO0FBQ0E7OztBQUNFLFFBQU1xRyxlQUFOLEdBQXdCO0FBQ3RCLFVBQU1DLEtBQUssR0FBRyxNQUFNaEksUUFBUSxDQUFDaUksa0JBQVQsRUFBcEI7O0FBQ0EsU0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHRixLQUFLLENBQUNHLE1BQTFCLEVBQWtDRCxDQUFDLEVBQW5DLEVBQXVDO0FBQ3JDLFVBQUlsRSxJQUFJLEdBQUdnRSxLQUFLLENBQUNFLENBQUQsQ0FBaEI7QUFDQSxXQUFLeEcsS0FBTCxDQUFXLENBQUNzQyxJQUFJLEtBQUssS0FBS2xDLFNBQWQsR0FBMEIsSUFBMUIsR0FBaUMsSUFBbEMsSUFBMENrQyxJQUFyRDtBQUNEO0FBQ0Y7QUFFRDtBQUNGO0FBQ0E7OztBQUNFLFFBQU1pRSxrQkFBTixHQUEyQjtBQUN6QixXQUFPakksUUFBUSxDQUFDaUksa0JBQVQsRUFBUDtBQUNEO0FBRUQ7QUFDRjtBQUNBOzs7QUFDRSxRQUFNRyxjQUFOLEdBQXVCO0FBQ3JCLFdBQU9wSSxRQUFRLENBQUNvSSxjQUFULEVBQVA7QUFDRDtBQUVEO0FBQ0Y7QUFDQTs7O0FBQ0UsUUFBTUMsTUFBTixDQUFhQyxJQUFiLEVBQTJCL0UsT0FBM0IsRUFBNEM7QUFDMUMsU0FBS3JDLEtBQUwsQ0FBV3FILEtBQVg7O0FBQ0EsVUFBTUMsTUFBeUIsR0FBRyxNQUFNQyxrQkFBU0osTUFBVCxDQUFnQixDQUN0RDtBQUNFQyxNQUFBQSxJQURGO0FBRUV0RSxNQUFBQSxJQUFJLEVBQUUsT0FGUjtBQUdFVCxNQUFBQTtBQUhGLEtBRHNELENBQWhCLENBQXhDOztBQU9BLFNBQUtyQyxLQUFMLENBQVd3SCxNQUFYOztBQUNBLFdBQU9GLE1BQU0sQ0FBQ1YsS0FBZDtBQUNEO0FBRUQ7QUFDRjtBQUNBOzs7QUFDRSxRQUFNWCxhQUFOLENBQW9CNUQsT0FBcEIsRUFBcUM7QUFDbkMsV0FBTyxLQUFLOEUsTUFBTCxDQUFZLE9BQVosRUFBcUI5RSxPQUFyQixDQUFQO0FBQ0Q7O0FBRUQsUUFBTUssY0FBTixDQUFxQkwsT0FBckIsRUFBc0M7QUFDcEMsV0FBTyxLQUFLOEUsTUFBTCxDQUFZLFVBQVosRUFBd0I5RSxPQUF4QixDQUFQO0FBQ0Q7QUFFRDtBQUNGO0FBQ0E7OztBQUNFLFFBQU1tRSxhQUFOLENBQW9CbkUsT0FBcEIsRUFBcUM7QUFDbkMsV0FBTyxLQUFLOEUsTUFBTCxDQUFZLFNBQVosRUFBdUI5RSxPQUF2QixDQUFQO0FBQ0Q7QUFFRDtBQUNGO0FBQ0E7OztBQUNFOEIsRUFBQUEsT0FBTyxDQUFDVSxHQUFELEVBQWM7QUFDbkIsdUJBQVFBLEdBQVI7QUFDRDtBQUVEO0FBQ0Y7QUFDQTs7O0FBQ0U0QyxFQUFBQSxtQkFBbUIsQ0FBQzVDLEdBQUQsRUFBZTtBQUNoQyxRQUFJNkMsWUFBWSxHQUFJLEdBQUUsS0FBS25ILEtBQUwsQ0FBV2UsV0FBWSw0QkFBMkIsS0FBS2YsS0FBTCxDQUFXYyxXQUFZLEVBQS9GOztBQUNBLFFBQUl3RCxHQUFKLEVBQVM7QUFDUDZDLE1BQUFBLFlBQVksSUFBSSxhQUFhQyxrQkFBa0IsQ0FBQzlDLEdBQUQsQ0FBL0M7QUFDRDs7QUFDRCxTQUFLVixPQUFMLENBQWF1RCxZQUFiO0FBQ0Q7O0FBcGFjO0FBdWFqQjs7OztBQUVBLE1BQU1FLEdBQUcsR0FBRyxJQUFJNUksR0FBSixFQUFaO2VBRWU0SSxHIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBDb21tYW5kIGxpbmUgaW50ZXJmYWNlIGZvciBKU2ZvcmNlXG4gKiBAYXV0aG9yIFNoaW5pY2hpIFRvbWl0YSA8c2hpbmljaGkudG9taXRhQGdtYWlsLmNvbT5cbiAqL1xuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgb3BlblVybCBmcm9tICdvcGVuJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGlucXVpcmVyIGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCByZXF1ZXN0IGZyb20gJy4uL3JlcXVlc3QnO1xuaW1wb3J0IGJhc2U2NHVybCBmcm9tICdiYXNlNjR1cmwnO1xuaW1wb3J0IFJlcGwgZnJvbSAnLi9yZXBsJztcbmltcG9ydCBqc2ZvcmNlLCB7IENvbm5lY3Rpb24sIE9BdXRoMiB9IGZyb20gJy4uJztcbmltcG9ydCB2ZXJzaW9uIGZyb20gJy4uL1ZFUlNJT04nO1xuaW1wb3J0IHsgT3B0aW9uYWwgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBDbGllbnRDb25maWcgfSBmcm9tICcuLi9yZWdpc3RyeS90eXBlcyc7XG5cbmNvbnN0IHJlZ2lzdHJ5ID0ganNmb3JjZS5yZWdpc3RyeTtcblxuaW50ZXJmYWNlIENsaUNvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgY29ubmVjdGlvbj86IHN0cmluZztcbiAgdXNlcm5hbWU/OiBzdHJpbmc7XG4gIHBhc3N3b3JkPzogc3RyaW5nO1xuICBsb2dpblVybD86IHN0cmluZztcbiAgc2FuZGJveD86IGJvb2xlYW47XG4gIGV2YWxTY3JpcHQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIENsaSB7XG4gIF9yZXBsOiBSZXBsID0gbmV3IFJlcGwodGhpcyk7XG4gIF9jb25uOiBDb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oKTtcbiAgX2Nvbm5OYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIF9vdXRwdXRFbmFibGVkOiBib29sZWFuID0gdHJ1ZTtcbiAgX2RlZmF1bHRMb2dpblVybDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgcmVhZENvbW1hbmQoKTogQ2xpQ29tbWFuZCB7XG4gICAgcmV0dXJuIG5ldyBDb21tYW5kKClcbiAgICAgIC5vcHRpb24oJy11LCAtLXVzZXJuYW1lIFt1c2VybmFtZV0nLCAnU2FsZXNmb3JjZSB1c2VybmFtZScpXG4gICAgICAub3B0aW9uKFxuICAgICAgICAnLXAsIC0tcGFzc3dvcmQgW3Bhc3N3b3JkXScsXG4gICAgICAgICdTYWxlc2ZvcmNlIHBhc3N3b3JkIChhbmQgc2VjdXJpdHkgdG9rZW4sIGlmIGF2YWlsYWJsZSknLFxuICAgICAgKVxuICAgICAgLm9wdGlvbihcbiAgICAgICAgJy1jLCAtLWNvbm5lY3Rpb24gW2Nvbm5lY3Rpb25dJyxcbiAgICAgICAgJ0Nvbm5lY3Rpb24gbmFtZSBzdG9yZWQgaW4gY29ubmVjdGlvbiByZWdpc3RyeScsXG4gICAgICApXG4gICAgICAub3B0aW9uKCctbCwgLS1sb2dpblVybCBbbG9naW5VcmxdJywgJ1NhbGVzZm9yY2UgbG9naW4gdXJsJylcbiAgICAgIC5vcHRpb24oJy0tc2FuZGJveCcsICdMb2dpbiB0byBTYWxlc2ZvcmNlIHNhbmRib3gnKVxuICAgICAgLm9wdGlvbignLWUsIC0tZXZhbFNjcmlwdCBbZXZhbFNjcmlwdF0nLCAnU2NyaXB0IHRvIGV2YWx1YXRlJylcbiAgICAgIC52ZXJzaW9uKHZlcnNpb24pXG4gICAgICAucGFyc2UocHJvY2Vzcy5hcmd2KTtcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0KCkge1xuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnJlYWRDb21tYW5kKCk7XG4gICAgdGhpcy5fb3V0cHV0RW5hYmxlZCA9ICFwcm9ncmFtLmV2YWxTY3JpcHQ7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuY29ubmVjdChwcm9ncmFtKTtcbiAgICAgIGlmIChwcm9ncmFtLmV2YWxTY3JpcHQpIHtcbiAgICAgICAgdGhpcy5fcmVwbC5zdGFydCh7XG4gICAgICAgICAgaW50ZXJhY3RpdmU6IGZhbHNlLFxuICAgICAgICAgIGV2YWxTY3JpcHQ6IHByb2dyYW0uZXZhbFNjcmlwdCxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZXBsLnN0YXJ0KCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICBwcm9jZXNzLmV4aXQoKTtcbiAgICB9XG4gIH1cblxuICBnZXRDdXJyZW50Q29ubmVjdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29ubjtcbiAgfVxuXG4gIHByaW50KC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgaWYgKHRoaXMuX291dHB1dEVuYWJsZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIHNhdmVDdXJyZW50Q29ubmVjdGlvbigpIHtcbiAgICBpZiAodGhpcy5fY29ubk5hbWUpIHtcbiAgICAgIGNvbnN0IGNvbm4gPSB0aGlzLl9jb25uO1xuICAgICAgY29uc3QgY29ubk5hbWUgPSB0aGlzLl9jb25uTmFtZTtcbiAgICAgIGNvbnN0IGNvbm5Db25maWcgPSB7XG4gICAgICAgIG9hdXRoMjogY29ubi5vYXV0aDJcbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgY2xpZW50SWQ6IGNvbm4ub2F1dGgyLmNsaWVudElkIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgY2xpZW50U2VjcmV0OiBjb25uLm9hdXRoMi5jbGllbnRTZWNyZXQgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICByZWRpcmVjdFVyaTogY29ubi5vYXV0aDIucmVkaXJlY3RVcmkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICBsb2dpblVybDogY29ubi5vYXV0aDIubG9naW5VcmwgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBhY2Nlc3NUb2tlbjogY29ubi5hY2Nlc3NUb2tlbiB8fCB1bmRlZmluZWQsXG4gICAgICAgIGluc3RhbmNlVXJsOiBjb25uLmluc3RhbmNlVXJsIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgcmVmcmVzaFRva2VuOiBjb25uLnJlZnJlc2hUb2tlbiB8fCB1bmRlZmluZWQsXG4gICAgICB9O1xuICAgICAgcmVnaXN0cnkuc2F2ZUNvbm5lY3Rpb25Db25maWcoY29ubk5hbWUsIGNvbm5Db25maWcpO1xuICAgIH1cbiAgfVxuXG4gIHNldExvZ2luU2VydmVyKGxvZ2luU2VydmVyOiBPcHRpb25hbDxzdHJpbmc+KSB7XG4gICAgaWYgKCFsb2dpblNlcnZlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAobG9naW5TZXJ2ZXIgPT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgdGhpcy5fZGVmYXVsdExvZ2luVXJsID0gJ2h0dHBzOi8vbG9naW4uc2FsZXNmb3JjZS5jb20nO1xuICAgIH0gZWxzZSBpZiAobG9naW5TZXJ2ZXIgPT09ICdzYW5kYm94Jykge1xuICAgICAgdGhpcy5fZGVmYXVsdExvZ2luVXJsID0gJ2h0dHBzOi8vdGVzdC5zYWxlc2ZvcmNlLmNvbSc7XG4gICAgfSBlbHNlIGlmIChsb2dpblNlcnZlci5pbmRleE9mKCdodHRwczovLycpICE9PSAwKSB7XG4gICAgICB0aGlzLl9kZWZhdWx0TG9naW5VcmwgPSAnaHR0cHM6Ly8nICsgbG9naW5TZXJ2ZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2RlZmF1bHRMb2dpblVybCA9IGxvZ2luU2VydmVyO1xuICAgIH1cbiAgICB0aGlzLnByaW50KGBVc2luZyBcIiR7dGhpcy5fZGVmYXVsdExvZ2luVXJsfVwiIGFzIGRlZmF1bHQgbG9naW4gVVJMLmApO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBhc3luYyBjb25uZWN0KG9wdGlvbnM6IHtcbiAgICB1c2VybmFtZT86IHN0cmluZztcbiAgICBwYXNzd29yZD86IHN0cmluZztcbiAgICBjb25uZWN0aW9uPzogc3RyaW5nO1xuICAgIGxvZ2luVXJsPzogc3RyaW5nO1xuICAgIHNhbmRib3g/OiBib29sZWFuO1xuICB9KSB7XG4gICAgY29uc3QgbG9naW5TZXJ2ZXIgPSBvcHRpb25zLmxvZ2luVXJsXG4gICAgICA/IG9wdGlvbnMubG9naW5VcmxcbiAgICAgIDogb3B0aW9ucy5zYW5kYm94XG4gICAgICA/ICdzYW5kYm94J1xuICAgICAgOiBudWxsO1xuICAgIHRoaXMuc2V0TG9naW5TZXJ2ZXIobG9naW5TZXJ2ZXIpO1xuICAgIHRoaXMuX2Nvbm5OYW1lID0gb3B0aW9ucy5jb25uZWN0aW9uO1xuICAgIGxldCBjb25uQ29uZmlnID0gYXdhaXQgcmVnaXN0cnkuZ2V0Q29ubmVjdGlvbkNvbmZpZyhvcHRpb25zLmNvbm5lY3Rpb24pO1xuICAgIGxldCB1c2VybmFtZSA9IG9wdGlvbnMudXNlcm5hbWU7XG4gICAgaWYgKCFjb25uQ29uZmlnKSB7XG4gICAgICBjb25uQ29uZmlnID0ge307XG4gICAgICBpZiAodGhpcy5fZGVmYXVsdExvZ2luVXJsKSB7XG4gICAgICAgIGNvbm5Db25maWcubG9naW5VcmwgPSB0aGlzLl9kZWZhdWx0TG9naW5Vcmw7XG4gICAgICB9XG4gICAgICB1c2VybmFtZSA9IHVzZXJuYW1lIHx8IG9wdGlvbnMuY29ubmVjdGlvbjtcbiAgICB9XG4gICAgdGhpcy5fY29ubiA9IG5ldyBDb25uZWN0aW9uKGNvbm5Db25maWcpO1xuICAgIGNvbnN0IHBhc3N3b3JkID0gb3B0aW9ucy5wYXNzd29yZDtcbiAgICBpZiAodXNlcm5hbWUpIHtcbiAgICAgIGF3YWl0IHRoaXMuc3RhcnRQYXNzd29yZEF1dGgodXNlcm5hbWUsIHBhc3N3b3JkKTtcbiAgICAgIHRoaXMuc2F2ZUN1cnJlbnRDb25uZWN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLl9jb25uTmFtZSAmJiB0aGlzLl9jb25uLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgIHRoaXMuX2Nvbm4ub24oJ3JlZnJlc2gnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5wcmludCgnUmVmcmVzaGluZyBhY2Nlc3MgdG9rZW4gLi4uICcpO1xuICAgICAgICAgIHRoaXMuc2F2ZUN1cnJlbnRDb25uZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGlkZW50aXR5ID0gYXdhaXQgdGhpcy5fY29ubi5pZGVudGl0eSgpO1xuICAgICAgICAgIHRoaXMucHJpbnQoYExvZ2dlZCBpbiBhcyA6ICR7aWRlbnRpdHkudXNlcm5hbWV9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHRoaXMucHJpbnQoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgIGlmICh0aGlzLl9jb25uLm9hdXRoMikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgcmUtYXV0aG9yaXplIGNvbm5lY3Rpb24uJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RhcnRQYXNzd29yZEF1dGgodGhpcy5fY29ubk5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgYXN5bmMgc3RhcnRQYXNzd29yZEF1dGgodXNlcm5hbWU6IHN0cmluZywgcGFzc3dvcmQ/OiBzdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5sb2dpbkJ5UGFzc3dvcmQodXNlcm5hbWUsIHBhc3N3b3JkLCAyKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIubWVzc2FnZSA9PT0gJ2NhbmNlbGVkJykge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdQYXNzd29yZCBhdXRoZW50aWNhdGlvbiBjYW5jZWxlZDogTm90IGxvZ2dlZCBpbicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgYXN5bmMgbG9naW5CeVBhc3N3b3JkKFxuICAgIHVzZXJuYW1lOiBzdHJpbmcsXG4gICAgcGFzc3dvcmQ6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICByZXRyeUNvdW50OiBudW1iZXIsXG4gICk6IFByb21pc2U8eyBpZDogc3RyaW5nIH0+IHtcbiAgICBpZiAocGFzc3dvcmQgPT09ICcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbmNlbGVkJyk7XG4gICAgfVxuICAgIGlmIChwYXNzd29yZCA9PSBudWxsKSB7XG4gICAgICBjb25zdCBwYXNzID0gYXdhaXQgdGhpcy5wcm9tcHRQYXNzd29yZCgnUGFzc3dvcmQ6ICcpO1xuICAgICAgcmV0dXJuIHRoaXMubG9naW5CeVBhc3N3b3JkKHVzZXJuYW1lLCBwYXNzLCByZXRyeUNvdW50KTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuX2Nvbm4ubG9naW4odXNlcm5hbWUsIHBhc3N3b3JkKTtcbiAgICAgIHRoaXMucHJpbnQoYExvZ2dlZCBpbiBhcyA6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihlcnIubWVzc2FnZSk7XG4gICAgICBpZiAocmV0cnlDb3VudCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9naW5CeVBhc3N3b3JkKHVzZXJuYW1lLCB1bmRlZmluZWQsIHJldHJ5Q291bnQgLSAxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2FuY2VsZWQnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIGRpc2Nvbm5lY3QoY29ubk5hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBuYW1lID0gY29ubk5hbWUgfHwgdGhpcy5fY29ubk5hbWU7XG4gICAgaWYgKG5hbWUgJiYgcmVnaXN0cnkuZ2V0Q29ubmVjdGlvbkNvbmZpZyhuYW1lKSkge1xuICAgICAgcmVnaXN0cnkucmVtb3ZlQ29ubmVjdGlvbkNvbmZpZyhuYW1lKTtcbiAgICAgIHRoaXMucHJpbnQoYERpc2Nvbm5lY3QgY29ubmVjdGlvbiAnJHtuYW1lfSdgKTtcbiAgICB9XG4gICAgdGhpcy5fY29ubk5hbWUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fY29ubiA9IG5ldyBDb25uZWN0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIGFzeW5jIGF1dGhvcml6ZShjbGllbnROYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBuYW1lID0gY2xpZW50TmFtZSB8fCAnZGVmYXVsdCc7XG4gICAgdmFyIG9hdXRoMkNvbmZpZyA9IGF3YWl0IHJlZ2lzdHJ5LmdldENsaWVudENvbmZpZyhuYW1lKTtcbiAgICBpZiAoIW9hdXRoMkNvbmZpZyB8fCAhb2F1dGgyQ29uZmlnLmNsaWVudElkKSB7XG4gICAgICBpZiAobmFtZSA9PT0gJ2RlZmF1bHQnIHx8IG5hbWUgPT09ICdzYW5kYm94Jykge1xuICAgICAgICB0aGlzLnByaW50KFxuICAgICAgICAgICdObyBjbGllbnQgaW5mb3JtYXRpb24gcmVnaXN0ZXJlZC4gRG93bmxvYWRpbmcgSlNmb3JjZSBkZWZhdWx0IGNsaWVudCBpbmZvcm1hdGlvbi4uLicsXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiB0aGlzLmRvd25sb2FkRGVmYXVsdENsaWVudEluZm8obmFtZSk7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBObyBPQXV0aDIgY2xpZW50IGluZm9ybWF0aW9uIHJlZ2lzdGVyZWQgOiAnJHtuYW1lfScuIFBsZWFzZSByZWdpc3RlciBjbGllbnQgaW5mbyBmaXJzdC5gLFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3Qgb2F1dGgyID0gbmV3IE9BdXRoMihvYXV0aDJDb25maWcpO1xuICAgIGNvbnN0IHZlcmlmaWVyID0gYmFzZTY0dXJsLmVuY29kZShjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpKTtcbiAgICBjb25zdCBjaGFsbGVuZ2UgPSBiYXNlNjR1cmwuZW5jb2RlKFxuICAgICAgY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZSh2ZXJpZmllcikuZGlnZXN0KCksXG4gICAgKTtcbiAgICBjb25zdCBzdGF0ZSA9IGJhc2U2NHVybC5lbmNvZGUoY3J5cHRvLnJhbmRvbUJ5dGVzKDMyKSk7XG4gICAgY29uc3QgYXV0aHpVcmwgPSBvYXV0aDIuZ2V0QXV0aG9yaXphdGlvblVybCh7XG4gICAgICBjb2RlX2NoYWxsZW5nZTogY2hhbGxlbmdlLFxuICAgICAgc3RhdGUsXG4gICAgfSk7XG4gICAgdGhpcy5wcmludCgnT3BlbmluZyBhdXRob3JpemF0aW9uIHBhZ2UgaW4gYnJvd3Nlci4uLicpO1xuICAgIHRoaXMucHJpbnQoYFVSTDogJHthdXRoelVybH1gKTtcbiAgICB0aGlzLm9wZW5VcmwoYXV0aHpVcmwpO1xuICAgIGNvbnN0IHBhcmFtcyA9IGF3YWl0IHRoaXMud2FpdENhbGxiYWNrKG9hdXRoMkNvbmZpZy5yZWRpcmVjdFVyaSwgc3RhdGUpO1xuICAgIGlmICghcGFyYW1zLmNvZGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gYXV0aG9yaXphdGlvbiBjb2RlIHJldHVybmVkLicpO1xuICAgIH1cbiAgICBpZiAocGFyYW1zLnN0YXRlICE9PSBzdGF0ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0YXRlIHBhcmFtZXRlciByZXR1cm5lZC4nKTtcbiAgICB9XG4gICAgdGhpcy5fY29ubiA9IG5ldyBDb25uZWN0aW9uKHsgb2F1dGgyIH0pO1xuICAgIHRoaXMucHJpbnQoXG4gICAgICAnUmVjZWl2ZWQgYXV0aG9yaXphdGlvbiBjb2RlLiBQbGVhc2UgY2xvc2UgdGhlIG9wZW5lZCBicm93c2VyIHdpbmRvdy4nLFxuICAgICk7XG4gICAgYXdhaXQgdGhpcy5fY29ubi5hdXRob3JpemUocGFyYW1zLmNvZGUsIHsgY29kZV92ZXJpZmllcjogdmVyaWZpZXIgfSk7XG4gICAgdGhpcy5wcmludCgnQXV0aG9yaXplZC4gRmV0Y2hpbmcgdXNlciBpbmZvLi4uJyk7XG4gICAgY29uc3QgaWRlbnRpdHkgPSBhd2FpdCB0aGlzLl9jb25uLmlkZW50aXR5KCk7XG4gICAgdGhpcy5wcmludChgTG9nZ2VkIGluIGFzIDogJHtpZGVudGl0eS51c2VybmFtZX1gKTtcbiAgICB0aGlzLl9jb25uTmFtZSA9IGlkZW50aXR5LnVzZXJuYW1lO1xuICAgIHRoaXMuc2F2ZUN1cnJlbnRDb25uZWN0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIGFzeW5jIGRvd25sb2FkRGVmYXVsdENsaWVudEluZm8oY2xpZW50TmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgY29uZmlnVXJsID0gJ2h0dHBzOi8vanNmb3JjZS5naXRodWIuaW8vY2xpZW50LWNvbmZpZy9kZWZhdWx0Lmpzb24nO1xuICAgIGNvbnN0IHJlczogeyBib2R5OiBzdHJpbmcgfSA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHJlcXVlc3QoeyBtZXRob2Q6ICdHRVQnLCB1cmw6IGNvbmZpZ1VybCB9KVxuICAgICAgICAub24oJ2NvbXBsZXRlJywgcmVzb2x2ZSlcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgfSk7XG4gICAgY29uc3QgY2xpZW50Q29uZmlnID0gSlNPTi5wYXJzZShyZXMuYm9keSk7XG4gICAgaWYgKGNsaWVudE5hbWUgPT09ICdzYW5kYm94Jykge1xuICAgICAgY2xpZW50Q29uZmlnLmxvZ2luVXJsID0gJ2h0dHBzOi8vdGVzdC5zYWxlc2ZvcmNlLmNvbSc7XG4gICAgfVxuICAgIGF3YWl0IHJlZ2lzdHJ5LnJlZ2lzdGVyQ2xpZW50Q29uZmlnKGNsaWVudE5hbWUsIGNsaWVudENvbmZpZyk7XG4gICAgdGhpcy5wcmludCgnQ2xpZW50IGluZm9ybWF0aW9uIGRvd25sb2FkZWQgc3VjY2Vzc2Z1bGx5LicpO1xuICAgIHJldHVybiB0aGlzLmF1dGhvcml6ZShjbGllbnROYW1lKTtcbiAgfVxuXG4gIGFzeW5jIHdhaXRDYWxsYmFjayhcbiAgICBzZXJ2ZXJVcmw6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBzdGF0ZTogc3RyaW5nLFxuICApOiBQcm9taXNlPHsgY29kZTogc3RyaW5nOyBzdGF0ZTogc3RyaW5nIH0+IHtcbiAgICBpZiAoc2VydmVyVXJsICYmIHNlcnZlclVybC5pbmRleE9mKCdodHRwOi8vbG9jYWxob3N0OicpID09PSAwKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcigocmVxLCByZXMpID0+IHtcbiAgICAgICAgICBpZiAoIXJlcS51cmwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgcXBhcmFtcyA9IHVybC5wYXJzZShyZXEudXJsLCB0cnVlKS5xdWVyeTtcbiAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvaHRtbCcgfSk7XG4gICAgICAgICAgcmVzLndyaXRlKFxuICAgICAgICAgICAgJzxodG1sPjxzY3JpcHQ+bG9jYXRpb24uaHJlZj1cImFib3V0OmJsYW5rXCI7PC9zY3JpcHQ+PC9odG1sPicsXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgaWYgKHFwYXJhbXMuZXJyb3IpIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IocXBhcmFtcy5lcnJvciBhcyBzdHJpbmcpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZShxcGFyYW1zIGFzIHsgY29kZTogc3RyaW5nOyBzdGF0ZTogc3RyaW5nIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgICByZXEuY29ubmVjdGlvbi5lbmQoKTtcbiAgICAgICAgICByZXEuY29ubmVjdGlvbi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBwb3J0ID0gTnVtYmVyKHVybC5wYXJzZShzZXJ2ZXJVcmwpLnBvcnQpO1xuICAgICAgICBzZXJ2ZXIubGlzdGVuKHBvcnQsICdsb2NhbGhvc3QnKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb2RlID0gYXdhaXQgdGhpcy5wcm9tcHRNZXNzYWdlKFxuICAgICAgICAnQ29weSAmIHBhc3RlIGF1dGh6IGNvZGUgcGFzc2VkIGluIHJlZGlyZWN0ZWQgVVJMOiAnLFxuICAgICAgKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGRlY29kZVVSSUNvbXBvbmVudChjb2RlKSwgc3RhdGUgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIGFzeW5jIHJlZ2lzdGVyKGNsaWVudE5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgY2xpZW50Q29uZmlnOiBDbGllbnRDb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gY2xpZW50TmFtZSB8fCAnZGVmYXVsdCc7XG4gICAgY29uc3QgcHJvbXB0cyA9IHtcbiAgICAgIGNsaWVudElkOiAnSW5wdXQgY2xpZW50IElEIDogJyxcbiAgICAgIGNsaWVudFNlY3JldDogJ0lucHV0IGNsaWVudCBzZWNyZXQgKG9wdGlvbmFsKSA6ICcsXG4gICAgICByZWRpcmVjdFVyaTogJ0lucHV0IHJlZGlyZWN0IFVSSSA6ICcsXG4gICAgICBsb2dpblVybDogJ0lucHV0IGxvZ2luIFVSTCAoZGVmYXVsdCBpcyBodHRwczovL2xvZ2luLnNhbGVzZm9yY2UuY29tKSA6ICcsXG4gICAgfTtcbiAgICBjb25zdCByZWdpc3RlcmVkID0gYXdhaXQgcmVnaXN0cnkuZ2V0Q2xpZW50Q29uZmlnKG5hbWUpO1xuICAgIGlmIChyZWdpc3RlcmVkKSB7XG4gICAgICBjb25zdCBtc2cgPSBgQ2xpZW50ICcke25hbWV9JyBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQuIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBvdmVycmlkZSA/IFt5Tl0gOiBgO1xuICAgICAgY29uc3Qgb2sgPSBhd2FpdCB0aGlzLnByb21wdENvbmZpcm0obXNnKTtcbiAgICAgIGlmICghb2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWdpc3RyYXRpb24gY2FuY2VsZWQuJyk7XG4gICAgICB9XG4gICAgfVxuICAgIGNsaWVudENvbmZpZyA9IGF3YWl0IE9iamVjdC5rZXlzKHByb21wdHMpLnJlZHVjZShhc3luYyAocHJvbWlzZSwgbmFtZSkgPT4ge1xuICAgICAgY29uc3QgY2NvbmZpZyA9IGF3YWl0IHByb21pc2U7XG4gICAgICBjb25zdCBwcm9tcHROYW1lID0gbmFtZSBhcyBrZXlvZiB0eXBlb2YgcHJvbXB0cztcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBwcm9tcHRzW3Byb21wdE5hbWVdO1xuICAgICAgaWYgKCFjY29uZmlnW3Byb21wdE5hbWVdKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgdGhpcy5wcm9tcHRNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uY2NvbmZpZyxcbiAgICAgICAgICAgIFtwcm9tcHROYW1lXTogdmFsdWUsXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNjb25maWc7XG4gICAgfSwgUHJvbWlzZS5yZXNvbHZlKGNsaWVudENvbmZpZykpO1xuICAgIGF3YWl0IHJlZ2lzdHJ5LnJlZ2lzdGVyQ2xpZW50Q29uZmlnKG5hbWUsIGNsaWVudENvbmZpZyk7XG4gICAgdGhpcy5wcmludCgnQ2xpZW50IHJlZ2lzdGVyZWQgc3VjY2Vzc2Z1bGx5LicpO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBhc3luYyBsaXN0Q29ubmVjdGlvbnMoKSB7XG4gICAgY29uc3QgbmFtZXMgPSBhd2FpdCByZWdpc3RyeS5nZXRDb25uZWN0aW9uTmFtZXMoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgdGhpcy5wcmludCgobmFtZSA9PT0gdGhpcy5fY29ubk5hbWUgPyAnKiAnIDogJyAgJykgKyBuYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIGFzeW5jIGdldENvbm5lY3Rpb25OYW1lcygpIHtcbiAgICByZXR1cm4gcmVnaXN0cnkuZ2V0Q29ubmVjdGlvbk5hbWVzKCk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIGFzeW5jIGdldENsaWVudE5hbWVzKCkge1xuICAgIHJldHVybiByZWdpc3RyeS5nZXRDbGllbnROYW1lcygpO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBhc3luYyBwcm9tcHQodHlwZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICB0aGlzLl9yZXBsLnBhdXNlKCk7XG4gICAgY29uc3QgYW5zd2VyOiB7IHZhbHVlOiBzdHJpbmcgfSA9IGF3YWl0IGlucXVpcmVyLnByb21wdChbXG4gICAgICB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIG5hbWU6ICd2YWx1ZScsXG4gICAgICAgIG1lc3NhZ2UsXG4gICAgICB9LFxuICAgIF0pO1xuICAgIHRoaXMuX3JlcGwucmVzdW1lKCk7XG4gICAgcmV0dXJuIGFuc3dlci52YWx1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgYXN5bmMgcHJvbXB0TWVzc2FnZShtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5wcm9tcHQoJ2lucHV0JywgbWVzc2FnZSk7XG4gIH1cblxuICBhc3luYyBwcm9tcHRQYXNzd29yZChtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5wcm9tcHQoJ3Bhc3N3b3JkJywgbWVzc2FnZSk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIGFzeW5jIHByb21wdENvbmZpcm0obWVzc2FnZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMucHJvbXB0KCdjb25maXJtJywgbWVzc2FnZSk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIG9wZW5VcmwodXJsOiBzdHJpbmcpIHtcbiAgICBvcGVuVXJsKHVybCk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIG9wZW5VcmxVc2luZ1Nlc3Npb24odXJsPzogc3RyaW5nKSB7XG4gICAgbGV0IGZyb250ZG9vclVybCA9IGAke3RoaXMuX2Nvbm4uaW5zdGFuY2VVcmx9L3NlY3VyL2Zyb250ZG9vci5qc3A/c2lkPSR7dGhpcy5fY29ubi5hY2Nlc3NUb2tlbn1gO1xuICAgIGlmICh1cmwpIHtcbiAgICAgIGZyb250ZG9vclVybCArPSAnJnJldFVSTD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgfVxuICAgIHRoaXMub3BlblVybChmcm9udGRvb3JVcmwpO1xuICB9XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuY29uc3QgY2xpID0gbmV3IENsaSgpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGk7XG4iXX0=