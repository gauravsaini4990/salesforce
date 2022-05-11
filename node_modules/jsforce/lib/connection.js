"use strict";

var _interopRequireWildcard = require("@babel/runtime-corejs3/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");

var _Symbol$toPrimitive = require("@babel/runtime-corejs3/core-js-stable/symbol/to-primitive");

var _Object$defineProperty = require("@babel/runtime-corejs3/core-js-stable/object/define-property");

var _Object$defineProperties = require("@babel/runtime-corejs3/core-js-stable/object/define-properties");

var _Object$getOwnPropertyDescriptors = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-descriptors");

var _forEachInstanceProperty = require("@babel/runtime-corejs3/core-js-stable/instance/for-each");

var _Object$getOwnPropertyDescriptor = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-descriptor");

var _filterInstanceProperty = require("@babel/runtime-corejs3/core-js-stable/instance/filter");

var _Object$getOwnPropertySymbols = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-symbols");

var _Object$keys = require("@babel/runtime-corejs3/core-js-stable/object/keys");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

require("core-js/modules/es.string.replace");

_Object$defineProperty(exports, "__esModule", {
  value: true
});

exports.default = exports.Connection = void 0;

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/objectWithoutProperties"));

var _map = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/map"));

var _isArray = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/array/is-array"));

var _indexOf = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/index-of"));

var _stringify = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/json/stringify"));

var _parseInt2 = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/parse-int"));

var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/defineProperty"));

var _slice = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/slice"));

var _events = require("events");

var _jsforce = _interopRequireDefault(require("./jsforce"));

var _transport = _interopRequireWildcard(require("./transport"));

var _logger = require("./util/logger");

var _oauth = _interopRequireDefault(require("./oauth2"));

var _cache = _interopRequireDefault(require("./cache"));

var _httpApi = _interopRequireDefault(require("./http-api"));

var _sessionRefreshDelegate = _interopRequireDefault(require("./session-refresh-delegate"));

var _query = _interopRequireDefault(require("./query"));

var _sobject = _interopRequireDefault(require("./sobject"));

var _quickAction = _interopRequireDefault(require("./quick-action"));

var _process = _interopRequireDefault(require("./process"));

var _formatter = require("./util/formatter");

function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }

function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[_Symbol$toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }

function ownKeys(object, enumerableOnly) { var keys = _Object$keys(object); if (_Object$getOwnPropertySymbols) { var symbols = _Object$getOwnPropertySymbols(object); if (enumerableOnly) symbols = _filterInstanceProperty(symbols).call(symbols, function (sym) { return _Object$getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { var _context6; _forEachInstanceProperty(_context6 = ownKeys(Object(source), true)).call(_context6, function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (_Object$getOwnPropertyDescriptors) { _Object$defineProperties(target, _Object$getOwnPropertyDescriptors(source)); } else { var _context7; _forEachInstanceProperty(_context7 = ownKeys(Object(source))).call(_context7, function (key) { _Object$defineProperty(target, key, _Object$getOwnPropertyDescriptor(source, key)); }); } } return target; }

/**
 *
 */
const defaultConnectionConfig = {
  loginUrl: 'https://login.salesforce.com',
  instanceUrl: '',
  version: '50.0',
  logLevel: 'NONE',
  maxRequest: 10
};
/**
 *
 */

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/**
 *
 */


function parseSignedRequest(sr) {
  if (typeof sr === 'string') {
    if (sr[0] === '{') {
      // might be JSON
      return JSON.parse(sr);
    } // might be original base64-encoded signed request


    const msg = sr.split('.').pop(); // retrieve latter part

    if (!msg) {
      throw new Error('Invalid signed request');
    }

    const json = Buffer.from(msg, 'base64').toString('utf-8');
    return JSON.parse(json);
  }

  return sr;
}
/** @private **/


function parseIdUrl(url) {
  var _context;

  const [organizationId, id] = (0, _slice.default)(_context = url.split('/')).call(_context, -2);
  return {
    id,
    organizationId,
    url
  };
}
/**
 * Session Refresh delegate function for OAuth2 authz code flow
 * @private
 */


async function oauthRefreshFn(conn, callback) {
  try {
    if (!conn.refreshToken) {
      throw new Error('No refresh token found in the connection');
    }

    const res = await conn.oauth2.refreshToken(conn.refreshToken);
    const userInfo = parseIdUrl(res.id);

    conn._establish({
      instanceUrl: res.instance_url,
      accessToken: res.access_token,
      userInfo
    });

    callback(undefined, res.access_token, res);
  } catch (err) {
    callback(err);
  }
}
/**
 * Session Refresh delegate function for username/password login
 * @private
 */


function createUsernamePasswordRefreshFn(username, password) {
  return async (conn, callback) => {
    try {
      await conn.login(username, password);

      if (!conn.accessToken) {
        throw new Error('Access token not found after login');
      }

      callback(null, conn.accessToken);
    } catch (err) {
      callback(err);
    }
  };
}
/**
 * @private
 */


function toSaveResult(err) {
  return {
    success: false,
    errors: [err]
  };
}
/**
 *
 */


function raiseNoModuleError(name) {
  throw new Error(`API module '${name}' is not loaded, load 'jsforce/api/${name}' explicitly`);
}
/*
 * Constant of maximum records num in DML operation (update/delete)
 */


const MAX_DML_COUNT = 200;
/**
 *
 */

class Connection extends _events.EventEmitter {
  // describe: (name: string) => Promise<DescribeSObjectResult>;
  // describeGlobal: () => Promise<DescribeGlobalResult>;
  // API libs are not instantiated here so that core module to remain without dependencies to them
  // It is responsible for develpers to import api libs explicitly if they are using 'jsforce/core' instead of 'jsforce'.
  get analytics() {
    return raiseNoModuleError('analytics');
  }

  get apex() {
    return raiseNoModuleError('apex');
  }

  get bulk() {
    return raiseNoModuleError('bulk');
  }

  get chatter() {
    return raiseNoModuleError('chatter');
  }

  get metadata() {
    return raiseNoModuleError('metadata');
  }

  get soap() {
    return raiseNoModuleError('soap');
  }

  get streaming() {
    return raiseNoModuleError('streaming');
  }

  get tooling() {
    return raiseNoModuleError('tooling');
  }
  /**
   *
   */


  constructor(config = {}) {
    super();
    (0, _defineProperty2.default)(this, "version", void 0);
    (0, _defineProperty2.default)(this, "loginUrl", void 0);
    (0, _defineProperty2.default)(this, "instanceUrl", void 0);
    (0, _defineProperty2.default)(this, "accessToken", void 0);
    (0, _defineProperty2.default)(this, "refreshToken", void 0);
    (0, _defineProperty2.default)(this, "userInfo", void 0);
    (0, _defineProperty2.default)(this, "limitInfo", {});
    (0, _defineProperty2.default)(this, "oauth2", void 0);
    (0, _defineProperty2.default)(this, "sobjects", {});
    (0, _defineProperty2.default)(this, "cache", void 0);
    (0, _defineProperty2.default)(this, "_callOptions", void 0);
    (0, _defineProperty2.default)(this, "_maxRequest", void 0);
    (0, _defineProperty2.default)(this, "_logger", void 0);
    (0, _defineProperty2.default)(this, "_logLevel", void 0);
    (0, _defineProperty2.default)(this, "_transport", void 0);
    (0, _defineProperty2.default)(this, "_sessionType", void 0);
    (0, _defineProperty2.default)(this, "_refreshDelegate", void 0);
    (0, _defineProperty2.default)(this, "describe$", void 0);
    (0, _defineProperty2.default)(this, "describe$$", void 0);
    (0, _defineProperty2.default)(this, "describeSObject", void 0);
    (0, _defineProperty2.default)(this, "describeSObject$", void 0);
    (0, _defineProperty2.default)(this, "describeSObject$$", void 0);
    (0, _defineProperty2.default)(this, "describeGlobal$", void 0);
    (0, _defineProperty2.default)(this, "describeGlobal$$", void 0);
    (0, _defineProperty2.default)(this, "insert", this.create);
    (0, _defineProperty2.default)(this, "delete", this.destroy);
    (0, _defineProperty2.default)(this, "del", this.destroy);
    (0, _defineProperty2.default)(this, "process", new _process.default(this));
    const {
      loginUrl,
      instanceUrl,
      version,
      oauth2,
      maxRequest,
      logLevel,
      proxyUrl,
      httpProxy
    } = config;
    this.loginUrl = loginUrl || defaultConnectionConfig.loginUrl;
    this.instanceUrl = instanceUrl || defaultConnectionConfig.instanceUrl;
    this.version = version || defaultConnectionConfig.version;
    this.oauth2 = oauth2 instanceof _oauth.default ? oauth2 : new _oauth.default(_objectSpread({
      loginUrl: this.loginUrl,
      proxyUrl,
      httpProxy
    }, oauth2));
    let refreshFn = config.refreshFn;

    if (!refreshFn && this.oauth2.clientId) {
      refreshFn = oauthRefreshFn;
    }

    if (refreshFn) {
      this._refreshDelegate = new _sessionRefreshDelegate.default(this, refreshFn);
    }

    this._maxRequest = maxRequest || defaultConnectionConfig.maxRequest;
    this._logger = logLevel ? Connection._logger.createInstance(logLevel) : Connection._logger;
    this._logLevel = logLevel;
    this._transport = proxyUrl ? new _transport.XdProxyTransport(proxyUrl) : httpProxy ? new _transport.HttpProxyTransport(httpProxy) : new _transport.default();
    this._callOptions = config.callOptions;
    this.cache = new _cache.default();

    const describeCacheKey = type => type ? `describe.${type}` : 'describe';

    const describe = Connection.prototype.describe;
    this.describe = this.cache.createCachedFunction(describe, this, {
      key: describeCacheKey,
      strategy: 'NOCACHE'
    });
    this.describe$ = this.cache.createCachedFunction(describe, this, {
      key: describeCacheKey,
      strategy: 'HIT'
    });
    this.describe$$ = this.cache.createCachedFunction(describe, this, {
      key: describeCacheKey,
      strategy: 'IMMEDIATE'
    });
    this.describeSObject = this.describe;
    this.describeSObject$ = this.describe$;
    this.describeSObject$$ = this.describe$$;
    const describeGlobal = Connection.prototype.describeGlobal;
    this.describeGlobal = this.cache.createCachedFunction(describeGlobal, this, {
      key: 'describeGlobal',
      strategy: 'NOCACHE'
    });
    this.describeGlobal$ = this.cache.createCachedFunction(describeGlobal, this, {
      key: 'describeGlobal',
      strategy: 'HIT'
    });
    this.describeGlobal$$ = this.cache.createCachedFunction(describeGlobal, this, {
      key: 'describeGlobal',
      strategy: 'IMMEDIATE'
    });
    const {
      accessToken,
      refreshToken,
      sessionId,
      serverUrl,
      signedRequest
    } = config;

    this._establish({
      accessToken,
      refreshToken,
      instanceUrl,
      sessionId,
      serverUrl,
      signedRequest
    });

    _jsforce.default.emit('connection:new', this);
  }
  /* @private */


  _establish(options) {
    var _context2;

    const {
      accessToken,
      refreshToken,
      instanceUrl,
      sessionId,
      serverUrl,
      signedRequest,
      userInfo
    } = options;
    this.instanceUrl = serverUrl ? (0, _slice.default)(_context2 = serverUrl.split('/')).call(_context2, 0, 3).join('/') : instanceUrl || this.instanceUrl;
    this.accessToken = sessionId || accessToken || this.accessToken;
    this.refreshToken = refreshToken || this.refreshToken;

    if (this.refreshToken && !this._refreshDelegate) {
      throw new Error('Refresh token is specified without oauth2 client information or refresh function');
    }

    const signedRequestObject = signedRequest && parseSignedRequest(signedRequest);

    if (signedRequestObject) {
      this.accessToken = signedRequestObject.client.oauthToken;

      if (_transport.CanvasTransport.supported) {
        this._transport = new _transport.CanvasTransport(signedRequestObject);
      }
    }

    this.userInfo = userInfo || this.userInfo;
    this._sessionType = sessionId ? 'soap' : 'oauth2';

    this._resetInstance();
  }
  /* @priveate */


  _clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    this.instanceUrl = defaultConnectionConfig.instanceUrl;
    this.userInfo = null;
    this._sessionType = null;
  }
  /* @priveate */


  _resetInstance() {
    this.limitInfo = {};
    this.sobjects = {}; // TODO impl cache

    this.cache.clear();
    this.cache.get('describeGlobal').removeAllListeners('value');
    this.cache.get('describeGlobal').on('value', ({
      result
    }) => {
      if (result) {
        for (const so of result.sobjects) {
          this.sobject(so.name);
        }
      }
    });
    /*
    if (this.tooling) {
      this.tooling._resetInstance();
    }
    */
  }
  /**
   * Authorize (using oauth2 web server flow)
   */


  async authorize(code, params = {}) {
    const res = await this.oauth2.requestToken(code, params);
    const userInfo = parseIdUrl(res.id);

    this._establish({
      instanceUrl: res.instance_url,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      userInfo
    });

    this._logger.debug(`<login> completed. user id = ${userInfo.id}, org id = ${userInfo.organizationId}`);

    return userInfo;
  }
  /**
   *
   */


  async login(username, password) {
    this._refreshDelegate = new _sessionRefreshDelegate.default(this, createUsernamePasswordRefreshFn(username, password));

    if (this.oauth2 && this.oauth2.clientId && this.oauth2.clientSecret) {
      return this.loginByOAuth2(username, password);
    }

    return this.loginBySoap(username, password);
  }
  /**
   * Login by OAuth2 username & password flow
   */


  async loginByOAuth2(username, password) {
    const res = await this.oauth2.authenticate(username, password);
    const userInfo = parseIdUrl(res.id);

    this._establish({
      instanceUrl: res.instance_url,
      accessToken: res.access_token,
      userInfo
    });

    this._logger.info(`<login> completed. user id = ${userInfo.id}, org id = ${userInfo.organizationId}`);

    return userInfo;
  }
  /**
   *
   */


  async loginBySoap(username, password) {
    var _context3;

    if (!username || !password) {
      return _promise.default.reject(new Error('no username password given'));
    }

    const body = ['<se:Envelope xmlns:se="http://schemas.xmlsoap.org/soap/envelope/">', '<se:Header/>', '<se:Body>', '<login xmlns="urn:partner.soap.sforce.com">', `<username>${esc(username)}</username>`, `<password>${esc(password)}</password>`, '</login>', '</se:Body>', '</se:Envelope>'].join('');
    const soapLoginEndpoint = [this.loginUrl, 'services/Soap/u', this.version].join('/');
    const response = await this._transport.httpRequest({
      method: 'POST',
      url: soapLoginEndpoint,
      body,
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: '""'
      }
    });
    let m;

    if (response.statusCode >= 400) {
      m = response.body.match(/<faultstring>([^<]+)<\/faultstring>/);
      const faultstring = m && m[1];
      throw new Error(faultstring || response.body);
    }

    this._logger.debug(`SOAP response = ${response.body}`);

    m = response.body.match(/<serverUrl>([^<]+)<\/serverUrl>/);
    const serverUrl = m && m[1];
    m = response.body.match(/<sessionId>([^<]+)<\/sessionId>/);
    const sessionId = m && m[1];
    m = response.body.match(/<userId>([^<]+)<\/userId>/);
    const userId = m && m[1];
    m = response.body.match(/<organizationId>([^<]+)<\/organizationId>/);
    const organizationId = m && m[1];

    if (!serverUrl || !sessionId || !userId || !organizationId) {
      throw new Error('could not extract session information from login response');
    }

    const idUrl = [this.loginUrl, 'id', organizationId, userId].join('/');
    const userInfo = {
      id: userId,
      organizationId,
      url: idUrl
    };

    this._establish({
      serverUrl: (0, _slice.default)(_context3 = serverUrl.split('/')).call(_context3, 0, 3).join('/'),
      sessionId,
      userInfo
    });

    this._logger.info(`<login> completed. user id = ${userId}, org id = ${organizationId}`);

    return userInfo;
  }
  /**
   * Logout the current session
   */


  async logout(revoke) {
    this._refreshDelegate = undefined;

    if (this._sessionType === 'oauth2') {
      return this.logoutByOAuth2(revoke);
    }

    return this.logoutBySoap(revoke);
  }
  /**
   * Logout the current session by revoking access token via OAuth2 session revoke
   */


  async logoutByOAuth2(revoke) {
    const token = revoke ? this.refreshToken : this.accessToken;

    if (token) {
      await this.oauth2.revokeToken(token);
    } // Destroy the session bound to this connection


    this._clearSession();

    this._resetInstance();
  }
  /**
   * Logout the session by using SOAP web service API
   */


  async logoutBySoap(revoke) {
    const body = ['<se:Envelope xmlns:se="http://schemas.xmlsoap.org/soap/envelope/">', '<se:Header>', '<SessionHeader xmlns="urn:partner.soap.sforce.com">', `<sessionId>${esc(revoke ? this.refreshToken : this.accessToken)}</sessionId>`, '</SessionHeader>', '</se:Header>', '<se:Body>', '<logout xmlns="urn:partner.soap.sforce.com"/>', '</se:Body>', '</se:Envelope>'].join('');
    const response = await this._transport.httpRequest({
      method: 'POST',
      url: [this.instanceUrl, 'services/Soap/u', this.version].join('/'),
      body,
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: '""'
      }
    });

    this._logger.debug(`SOAP statusCode = ${response.statusCode}, response = ${response.body}`);

    if (response.statusCode >= 400) {
      const m = response.body.match(/<faultstring>([^<]+)<\/faultstring>/);
      const faultstring = m && m[1];
      throw new Error(faultstring || response.body);
    } // Destroy the session bound to this connection


    this._clearSession();

    this._resetInstance();
  }
  /**
   * Send REST API request with given HTTP request info, with connected session information.
   *
   * Endpoint URL can be absolute URL ('https://na1.salesforce.com/services/data/v32.0/sobjects/Account/describe')
   * , relative path from root ('/services/data/v32.0/sobjects/Account/describe')
   * , or relative path from version root ('/sobjects/Account/describe').
   */


  request(request, options = {}) {
    // if request is simple string, regard it as url in GET method
    let request_ = typeof request === 'string' ? {
      method: 'GET',
      url: request
    } : request; // if url is given in relative path, prepend base url or instance url before.

    request_ = _objectSpread(_objectSpread({}, request_), {}, {
      url: this._normalizeUrl(request_.url)
    });
    const httpApi = new _httpApi.default(this, options); // log api usage and its quota

    httpApi.on('response', response => {
      if (response.headers && response.headers['sforce-limit-info']) {
        const apiUsage = response.headers['sforce-limit-info'].match(/api-usage=(\d+)\/(\d+)/);

        if (apiUsage) {
          this.limitInfo = {
            apiUsage: {
              used: (0, _parseInt2.default)(apiUsage[1], 10),
              limit: (0, _parseInt2.default)(apiUsage[2], 10)
            }
          };
        }
      }
    });
    return httpApi.request(request_);
  }
  /**
   * Send HTTP GET request
   *
   * Endpoint URL can be absolute URL ('https://na1.salesforce.com/services/data/v32.0/sobjects/Account/describe')
   * , relative path from root ('/services/data/v32.0/sobjects/Account/describe')
   * , or relative path from version root ('/sobjects/Account/describe').
   */


  requestGet(url, options) {
    const request = {
      method: 'GET',
      url
    };
    return this.request(request, options);
  }
  /**
   * Send HTTP POST request with JSON body, with connected session information
   *
   * Endpoint URL can be absolute URL ('https://na1.salesforce.com/services/data/v32.0/sobjects/Account/describe')
   * , relative path from root ('/services/data/v32.0/sobjects/Account/describe')
   * , or relative path from version root ('/sobjects/Account/describe').
   */


  requestPost(url, body, options) {
    const request = {
      method: 'POST',
      url,
      body: (0, _stringify.default)(body),
      headers: {
        'content-type': 'application/json'
      }
    };
    return this.request(request, options);
  }
  /**
   * Send HTTP PUT request with JSON body, with connected session information
   *
   * Endpoint URL can be absolute URL ('https://na1.salesforce.com/services/data/v32.0/sobjects/Account/describe')
   * , relative path from root ('/services/data/v32.0/sobjects/Account/describe')
   * , or relative path from version root ('/sobjects/Account/describe').
   */


  requestPut(url, body, options) {
    const request = {
      method: 'PUT',
      url,
      body: (0, _stringify.default)(body),
      headers: {
        'content-type': 'application/json'
      }
    };
    return this.request(request, options);
  }
  /**
   * Send HTTP PATCH request with JSON body
   *
   * Endpoint URL can be absolute URL ('https://na1.salesforce.com/services/data/v32.0/sobjects/Account/describe')
   * , relative path from root ('/services/data/v32.0/sobjects/Account/describe')
   * , or relative path from version root ('/sobjects/Account/describe').
   */


  requestPatch(url, body, options) {
    const request = {
      method: 'PATCH',
      url,
      body: (0, _stringify.default)(body),
      headers: {
        'content-type': 'application/json'
      }
    };
    return this.request(request, options);
  }
  /**
   * Send HTTP DELETE request
   *
   * Endpoint URL can be absolute URL ('https://na1.salesforce.com/services/data/v32.0/sobjects/Account/describe')
   * , relative path from root ('/services/data/v32.0/sobjects/Account/describe')
   * , or relative path from version root ('/sobjects/Account/describe').
   */


  requestDelete(url, options) {
    const request = {
      method: 'DELETE',
      url
    };
    return this.request(request, options);
  }
  /** @private **/


  _baseUrl() {
    return [this.instanceUrl, 'services/data', `v${this.version}`].join('/');
  }
  /**
   * Convert path to absolute url
   * @private
   */


  _normalizeUrl(url) {
    if (url[0] === '/') {
      if ((0, _indexOf.default)(url).call(url, '/services/') === 0) {
        return this.instanceUrl + url;
      }

      return this._baseUrl() + url;
    }

    return url;
  }
  /**
   *
   */


  query(soql, options) {
    return new _query.default(this, soql, options);
  }
  /**
   * Execute search by SOSL
   *
   * @param {String} sosl - SOSL string
   * @param {Callback.<Array.<RecordResult>>} [callback] - Callback function
   * @returns {Promise.<Array.<RecordResult>>}
   */


  search(sosl) {
    var url = this._baseUrl() + '/search?q=' + encodeURIComponent(sosl);
    return this.request(url);
  }
  /**
   *
   */


  queryMore(locator, options) {
    return new _query.default(this, {
      locator
    }, options);
  }
  /* */


  _ensureVersion(majorVersion) {
    const versions = this.version.split('.');
    return (0, _parseInt2.default)(versions[0], 10) >= majorVersion;
  }
  /* */


  _supports(feature) {
    switch (feature) {
      case 'sobject-collection':
        // sobject collection is available only in API ver 42.0+
        return this._ensureVersion(42);

      default:
        return false;
    }
  }
  /**
   * Retrieve specified records
   */


  async retrieve(type, ids, options = {}) {
    return (0, _isArray.default)(ids) ? // check the version whether SObject collection API is supported (42.0)
    this._ensureVersion(42) ? this._retrieveMany(type, ids, options) : this._retrieveParallel(type, ids, options) : this._retrieveSingle(type, ids, options);
  }
  /** @private */


  async _retrieveSingle(type, id, options) {
    if (!id) {
      throw new Error('Invalid record ID. Specify valid record ID value');
    }

    let url = [this._baseUrl(), 'sobjects', type, id].join('/');
    const {
      fields,
      headers
    } = options;

    if (fields) {
      url += `?fields=${fields.join(',')}`;
    }

    return this.request({
      method: 'GET',
      url,
      headers
    });
  }
  /** @private */


  async _retrieveParallel(type, ids, options) {
    if (ids.length > this._maxRequest) {
      throw new Error('Exceeded max limit of concurrent call');
    }

    return _promise.default.all((0, _map.default)(ids).call(ids, id => this._retrieveSingle(type, id, options).catch(err => {
      if (options.allOrNone || err.errorCode !== 'NOT_FOUND') {
        throw err;
      }

      return null;
    })));
  }
  /** @private */


  async _retrieveMany(type, ids, options) {
    var _context4;

    if (ids.length === 0) {
      return [];
    }

    const url = [this._baseUrl(), 'composite', 'sobjects', type].join('/');
    const fields = options.fields || (0, _map.default)(_context4 = (await this.describe$(type)).fields).call(_context4, field => field.name);
    return this.request({
      method: 'POST',
      url,
      body: (0, _stringify.default)({
        ids,
        fields
      }),
      headers: _objectSpread(_objectSpread({}, options.headers || {}), {}, {
        'content-type': 'application/json'
      })
    });
  }
  /**
   * Create records
   */


  /**
   * @param type
   * @param records
   * @param options
   */
  async create(type, records, options = {}) {
    const ret = (0, _isArray.default)(records) ? // check the version whether SObject collection API is supported (42.0)
    this._ensureVersion(42) ? await this._createMany(type, records, options) : await this._createParallel(type, records, options) : await this._createSingle(type, records, options);
    return ret;
  }
  /** @private */


  async _createSingle(type, record, options) {
    const {
      Id,
      type: rtype,
      attributes
    } = record,
          rec = (0, _objectWithoutProperties2.default)(record, ["Id", "type", "attributes"]);
    const sobjectType = type || attributes && attributes.type || rtype;

    if (!sobjectType) {
      throw new Error('No SObject Type defined in record');
    }

    const url = [this._baseUrl(), 'sobjects', sobjectType].join('/');
    return this.request({
      method: 'POST',
      url,
      body: (0, _stringify.default)(rec),
      headers: _objectSpread(_objectSpread({}, options.headers || {}), {}, {
        'content-type': 'application/json'
      })
    });
  }
  /** @private */


  async _createParallel(type, records, options) {
    if (records.length > this._maxRequest) {
      throw new Error('Exceeded max limit of concurrent call');
    }

    return _promise.default.all((0, _map.default)(records).call(records, record => this._createSingle(type, record, options).catch(err => {
      // be aware that allOrNone in parallel mode will not revert the other successful requests
      // it only raises error when met at least one failed request.
      if (options.allOrNone || !err.errorCode) {
        throw err;
      }

      return toSaveResult(err);
    })));
  }
  /** @private */


  async _createMany(type, records, options) {
    if (records.length === 0) {
      return _promise.default.resolve([]);
    }

    if (records.length > MAX_DML_COUNT && options.allowRecursive) {
      return [...(await this._createMany(type, (0, _slice.default)(records).call(records, 0, MAX_DML_COUNT), options)), ...(await this._createMany(type, (0, _slice.default)(records).call(records, MAX_DML_COUNT), options))];
    }

    const _records = (0, _map.default)(records).call(records, record => {
      const {
        Id,
        type: rtype,
        attributes
      } = record,
            rec = (0, _objectWithoutProperties2.default)(record, ["Id", "type", "attributes"]);
      const sobjectType = type || attributes && attributes.type || rtype;

      if (!sobjectType) {
        throw new Error('No SObject Type defined in record');
      }

      return _objectSpread({
        attributes: {
          type: sobjectType
        }
      }, rec);
    });

    const url = [this._baseUrl(), 'composite', 'sobjects'].join('/');
    return this.request({
      method: 'POST',
      url,
      body: (0, _stringify.default)({
        allOrNone: options.allOrNone || false,
        records: _records
      }),
      headers: _objectSpread(_objectSpread({}, options.headers || {}), {}, {
        'content-type': 'application/json'
      })
    });
  }
  /**
   * Synonym of Connection#create()
   */


  /**
   * @param type
   * @param records
   * @param options
   */
  update(type, records, options = {}) {
    return (0, _isArray.default)(records) ? // check the version whether SObject collection API is supported (42.0)
    this._ensureVersion(42) ? this._updateMany(type, records, options) : this._updateParallel(type, records, options) : this._updateSingle(type, records, options);
  }
  /** @private */


  async _updateSingle(type, record, options) {
    const {
      Id: id,
      type: rtype,
      attributes
    } = record,
          rec = (0, _objectWithoutProperties2.default)(record, ["Id", "type", "attributes"]);

    if (!id) {
      throw new Error('Record id is not found in record.');
    }

    const sobjectType = type || attributes && attributes.type || rtype;

    if (!sobjectType) {
      throw new Error('No SObject Type defined in record');
    }

    const url = [this._baseUrl(), 'sobjects', sobjectType, id].join('/');
    return this.request({
      method: 'PATCH',
      url,
      body: (0, _stringify.default)(rec),
      headers: _objectSpread(_objectSpread({}, options.headers || {}), {}, {
        'content-type': 'application/json'
      })
    }, {
      noContentResponse: {
        id,
        success: true,
        errors: []
      }
    });
  }
  /** @private */


  async _updateParallel(type, records, options) {
    if (records.length > this._maxRequest) {
      throw new Error('Exceeded max limit of concurrent call');
    }

    return _promise.default.all((0, _map.default)(records).call(records, record => this._updateSingle(type, record, options).catch(err => {
      // be aware that allOrNone in parallel mode will not revert the other successful requests
      // it only raises error when met at least one failed request.
      if (options.allOrNone || !err.errorCode) {
        throw err;
      }

      return toSaveResult(err);
    })));
  }
  /** @private */


  async _updateMany(type, records, options) {
    if (records.length === 0) {
      return [];
    }

    if (records.length > MAX_DML_COUNT && options.allowRecursive) {
      return [...(await this._updateMany(type, (0, _slice.default)(records).call(records, 0, MAX_DML_COUNT), options)), ...(await this._updateMany(type, (0, _slice.default)(records).call(records, MAX_DML_COUNT), options))];
    }

    const _records = (0, _map.default)(records).call(records, record => {
      const {
        Id: id,
        type: rtype,
        attributes
      } = record,
            rec = (0, _objectWithoutProperties2.default)(record, ["Id", "type", "attributes"]);

      if (!id) {
        throw new Error('Record id is not found in record.');
      }

      const sobjectType = type || attributes && attributes.type || rtype;

      if (!sobjectType) {
        throw new Error('No SObject Type defined in record');
      }

      return _objectSpread({
        id,
        attributes: {
          type: sobjectType
        }
      }, rec);
    });

    const url = [this._baseUrl(), 'composite', 'sobjects'].join('/');
    return this.request({
      method: 'PATCH',
      url,
      body: (0, _stringify.default)({
        allOrNone: options.allOrNone || false,
        records: _records
      }),
      headers: _objectSpread(_objectSpread({}, options.headers || {}), {}, {
        'content-type': 'application/json'
      })
    });
  }
  /**
   * Upsert records
   */


  /**
   *
   * @param type
   * @param records
   * @param extIdField
   * @param options
   */
  async upsert(type, records, extIdField, options = {}) {
    const isArray = (0, _isArray.default)(records);

    const _records = (0, _isArray.default)(records) ? records : [records];

    if (_records.length > this._maxRequest) {
      throw new Error('Exceeded max limit of concurrent call');
    }

    const results = await _promise.default.all((0, _map.default)(_records).call(_records, record => {
      var _context5;

      const {
        [extIdField]: extId,
        type: rtype,
        attributes
      } = record,
            rec = (0, _objectWithoutProperties2.default)(record, (0, _map.default)(_context5 = [extIdField, "type", "attributes"]).call(_context5, _toPropertyKey));
      const url = [this._baseUrl(), 'sobjects', type, extIdField, extId].join('/');
      return this.request({
        method: 'PATCH',
        url,
        body: (0, _stringify.default)(rec),
        headers: _objectSpread(_objectSpread({}, options.headers || {}), {}, {
          'content-type': 'application/json'
        })
      }, {
        noContentResponse: {
          success: true,
          errors: []
        }
      }).catch(err => {
        // Be aware that `allOrNone` option in upsert method
        // will not revert the other successful requests.
        // It only raises error when met at least one failed request.
        if (!isArray || options.allOrNone || !err.errorCode) {
          throw err;
        }

        return toSaveResult(err);
      });
    }));
    return isArray ? results : results[0];
  }
  /**
   * Delete records
   */


  /**
   * @param type
   * @param ids
   * @param options
   */
  async destroy(type, ids, options = {}) {
    return (0, _isArray.default)(ids) ? // check the version whether SObject collection API is supported (42.0)
    this._ensureVersion(42) ? this._destroyMany(type, ids, options) : this._destroyParallel(type, ids, options) : this._destroySingle(type, ids, options);
  }
  /** @private */


  async _destroySingle(type, id, options) {
    const url = [this._baseUrl(), 'sobjects', type, id].join('/');
    return this.request({
      method: 'DELETE',
      url,
      headers: options.headers || {}
    }, {
      noContentResponse: {
        id,
        success: true,
        errors: []
      }
    });
  }
  /** @private */


  async _destroyParallel(type, ids, options) {
    if (ids.length > this._maxRequest) {
      throw new Error('Exceeded max limit of concurrent call');
    }

    return _promise.default.all((0, _map.default)(ids).call(ids, id => this._destroySingle(type, id, options).catch(err => {
      // Be aware that `allOrNone` option in parallel mode
      // will not revert the other successful requests.
      // It only raises error when met at least one failed request.
      if (options.allOrNone || !err.errorCode) {
        throw err;
      }

      return toSaveResult(err);
    })));
  }
  /** @private */


  async _destroyMany(type, ids, options) {
    if (ids.length === 0) {
      return [];
    }

    if (ids.length > MAX_DML_COUNT && options.allowRecursive) {
      return [...(await this._destroyMany(type, (0, _slice.default)(ids).call(ids, 0, MAX_DML_COUNT), options)), ...(await this._destroyMany(type, (0, _slice.default)(ids).call(ids, MAX_DML_COUNT), options))];
    }

    let url = [this._baseUrl(), 'composite', 'sobjects?ids='].join('/') + ids.join(',');

    if (options.allOrNone) {
      url += '&allOrNone=true';
    }

    return this.request({
      method: 'DELETE',
      url,
      headers: options.headers || {}
    });
  }
  /**
   * Synonym of Connection#destroy()
   */


  /**
   * Describe SObject metadata
   */
  async describe(type) {
    const url = [this._baseUrl(), 'sobjects', type, 'describe'].join('/');
    const body = await this.request(url);
    return body;
  }
  /**
   * Describe global SObjects
   */


  async describeGlobal() {
    const url = `${this._baseUrl()}/sobjects`;
    const body = await this.request(url);
    return body;
  }
  /**
   * Get SObject instance
   */


  sobject(type) {
    const so = this.sobjects[type] || new _sobject.default(this, type);
    this.sobjects[type] = so;
    return so;
  }
  /**
   * Get identity information of current user
   */


  async identity(options = {}) {
    let url = this.userInfo && this.userInfo.url;

    if (!url) {
      const res = await this.request({
        method: 'GET',
        url: this._baseUrl(),
        headers: options.headers
      });
      url = res.identity;
    }

    url += '?format=json';

    if (this.accessToken) {
      url += `&oauth_token=${encodeURIComponent(this.accessToken)}`;
    }

    const res = await this.request({
      method: 'GET',
      url
    });
    this.userInfo = {
      id: res.user_id,
      organizationId: res.organization_id,
      url: res.id
    };
    return res;
  }
  /**
   * List recently viewed records
   */


  async recent(type, limit) {
    /* eslint-disable no-param-reassign */
    if (typeof type === 'number') {
      limit = type;
      type = undefined;
    }

    let url;

    if (type) {
      url = [this._baseUrl(), 'sobjects', type].join('/');
      const {
        recentItems
      } = await this.request(url);
      return limit ? (0, _slice.default)(recentItems).call(recentItems, 0, limit) : recentItems;
    }

    url = `${this._baseUrl()}/recent`;

    if (limit) {
      url += `?limit=${limit}`;
    }

    return this.request(url);
  }
  /**
   * Retrieve updated records
   */


  async updated(type, start, end) {
    /* eslint-disable no-param-reassign */
    let url = [this._baseUrl(), 'sobjects', type, 'updated'].join('/');

    if (typeof start === 'string') {
      start = new Date(start);
    }

    start = (0, _formatter.formatDate)(start);
    url += `?start=${encodeURIComponent(start)}`;

    if (typeof end === 'string') {
      end = new Date(end);
    }

    end = (0, _formatter.formatDate)(end);
    url += `&end=${encodeURIComponent(end)}`;
    const body = await this.request(url);
    return body;
  }
  /**
   * Retrieve deleted records
   */


  async deleted(type, start, end) {
    /* eslint-disable no-param-reassign */
    let url = [this._baseUrl(), 'sobjects', type, 'deleted'].join('/');

    if (typeof start === 'string') {
      start = new Date(start);
    }

    start = (0, _formatter.formatDate)(start);
    url += `?start=${encodeURIComponent(start)}`;

    if (typeof end === 'string') {
      end = new Date(end);
    }

    end = (0, _formatter.formatDate)(end);
    url += `&end=${encodeURIComponent(end)}`;
    const body = await this.request(url);
    return body;
  }
  /**
   * Returns a list of all tabs
   */


  async tabs() {
    const url = [this._baseUrl(), 'tabs'].join('/');
    const body = await this.request(url);
    return body;
  }
  /**
   * Returns curren system limit in the organization
   */


  async limits() {
    const url = [this._baseUrl(), 'limits'].join('/');
    const body = await this.request(url);
    return body;
  }
  /**
   * Returns a theme info
   */


  async theme() {
    const url = [this._baseUrl(), 'theme'].join('/');
    const body = await this.request(url);
    return body;
  }
  /**
   * Returns all registered global quick actions
   */


  async quickActions() {
    const body = await this.request('/quickActions');
    return body;
  }
  /**
   * Get reference for specified global quick aciton
   */


  quickAction(actionName) {
    return new _quickAction.default(this, `/quickActions/${actionName}`);
  }
  /**
   * Module which manages process rules and approval processes
   */


}

exports.Connection = Connection;
(0, _defineProperty2.default)(Connection, "_logger", (0, _logger.getLogger)('connection'));
var _default = Connection;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25uZWN0aW9uLnRzIl0sIm5hbWVzIjpbImRlZmF1bHRDb25uZWN0aW9uQ29uZmlnIiwibG9naW5VcmwiLCJpbnN0YW5jZVVybCIsInZlcnNpb24iLCJsb2dMZXZlbCIsIm1heFJlcXVlc3QiLCJlc2MiLCJzdHIiLCJTdHJpbmciLCJyZXBsYWNlIiwicGFyc2VTaWduZWRSZXF1ZXN0Iiwic3IiLCJKU09OIiwicGFyc2UiLCJtc2ciLCJzcGxpdCIsInBvcCIsIkVycm9yIiwianNvbiIsIkJ1ZmZlciIsImZyb20iLCJ0b1N0cmluZyIsInBhcnNlSWRVcmwiLCJ1cmwiLCJvcmdhbml6YXRpb25JZCIsImlkIiwib2F1dGhSZWZyZXNoRm4iLCJjb25uIiwiY2FsbGJhY2siLCJyZWZyZXNoVG9rZW4iLCJyZXMiLCJvYXV0aDIiLCJ1c2VySW5mbyIsIl9lc3RhYmxpc2giLCJpbnN0YW5jZV91cmwiLCJhY2Nlc3NUb2tlbiIsImFjY2Vzc190b2tlbiIsInVuZGVmaW5lZCIsImVyciIsImNyZWF0ZVVzZXJuYW1lUGFzc3dvcmRSZWZyZXNoRm4iLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwibG9naW4iLCJ0b1NhdmVSZXN1bHQiLCJzdWNjZXNzIiwiZXJyb3JzIiwicmFpc2VOb01vZHVsZUVycm9yIiwibmFtZSIsIk1BWF9ETUxfQ09VTlQiLCJDb25uZWN0aW9uIiwiRXZlbnRFbWl0dGVyIiwiYW5hbHl0aWNzIiwiYXBleCIsImJ1bGsiLCJjaGF0dGVyIiwibWV0YWRhdGEiLCJzb2FwIiwic3RyZWFtaW5nIiwidG9vbGluZyIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwiY3JlYXRlIiwiZGVzdHJveSIsIlByb2Nlc3MiLCJwcm94eVVybCIsImh0dHBQcm94eSIsIk9BdXRoMiIsInJlZnJlc2hGbiIsImNsaWVudElkIiwiX3JlZnJlc2hEZWxlZ2F0ZSIsIlNlc3Npb25SZWZyZXNoRGVsZWdhdGUiLCJfbWF4UmVxdWVzdCIsIl9sb2dnZXIiLCJjcmVhdGVJbnN0YW5jZSIsIl9sb2dMZXZlbCIsIl90cmFuc3BvcnQiLCJYZFByb3h5VHJhbnNwb3J0IiwiSHR0cFByb3h5VHJhbnNwb3J0IiwiVHJhbnNwb3J0IiwiX2NhbGxPcHRpb25zIiwiY2FsbE9wdGlvbnMiLCJjYWNoZSIsIkNhY2hlIiwiZGVzY3JpYmVDYWNoZUtleSIsInR5cGUiLCJkZXNjcmliZSIsInByb3RvdHlwZSIsImNyZWF0ZUNhY2hlZEZ1bmN0aW9uIiwia2V5Iiwic3RyYXRlZ3kiLCJkZXNjcmliZSQiLCJkZXNjcmliZSQkIiwiZGVzY3JpYmVTT2JqZWN0IiwiZGVzY3JpYmVTT2JqZWN0JCIsImRlc2NyaWJlU09iamVjdCQkIiwiZGVzY3JpYmVHbG9iYWwiLCJkZXNjcmliZUdsb2JhbCQiLCJkZXNjcmliZUdsb2JhbCQkIiwic2Vzc2lvbklkIiwic2VydmVyVXJsIiwic2lnbmVkUmVxdWVzdCIsImpzZm9yY2UiLCJlbWl0Iiwib3B0aW9ucyIsImpvaW4iLCJzaWduZWRSZXF1ZXN0T2JqZWN0IiwiY2xpZW50Iiwib2F1dGhUb2tlbiIsIkNhbnZhc1RyYW5zcG9ydCIsInN1cHBvcnRlZCIsIl9zZXNzaW9uVHlwZSIsIl9yZXNldEluc3RhbmNlIiwiX2NsZWFyU2Vzc2lvbiIsImxpbWl0SW5mbyIsInNvYmplY3RzIiwiY2xlYXIiLCJnZXQiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJvbiIsInJlc3VsdCIsInNvIiwic29iamVjdCIsImF1dGhvcml6ZSIsImNvZGUiLCJwYXJhbXMiLCJyZXF1ZXN0VG9rZW4iLCJyZWZyZXNoX3Rva2VuIiwiZGVidWciLCJjbGllbnRTZWNyZXQiLCJsb2dpbkJ5T0F1dGgyIiwibG9naW5CeVNvYXAiLCJhdXRoZW50aWNhdGUiLCJpbmZvIiwicmVqZWN0IiwiYm9keSIsInNvYXBMb2dpbkVuZHBvaW50IiwicmVzcG9uc2UiLCJodHRwUmVxdWVzdCIsIm1ldGhvZCIsImhlYWRlcnMiLCJTT0FQQWN0aW9uIiwibSIsInN0YXR1c0NvZGUiLCJtYXRjaCIsImZhdWx0c3RyaW5nIiwidXNlcklkIiwiaWRVcmwiLCJsb2dvdXQiLCJyZXZva2UiLCJsb2dvdXRCeU9BdXRoMiIsImxvZ291dEJ5U29hcCIsInRva2VuIiwicmV2b2tlVG9rZW4iLCJyZXF1ZXN0IiwicmVxdWVzdF8iLCJfbm9ybWFsaXplVXJsIiwiaHR0cEFwaSIsIkh0dHBBcGkiLCJhcGlVc2FnZSIsInVzZWQiLCJsaW1pdCIsInJlcXVlc3RHZXQiLCJyZXF1ZXN0UG9zdCIsInJlcXVlc3RQdXQiLCJyZXF1ZXN0UGF0Y2giLCJyZXF1ZXN0RGVsZXRlIiwiX2Jhc2VVcmwiLCJxdWVyeSIsInNvcWwiLCJRdWVyeSIsInNlYXJjaCIsInNvc2wiLCJlbmNvZGVVUklDb21wb25lbnQiLCJxdWVyeU1vcmUiLCJsb2NhdG9yIiwiX2Vuc3VyZVZlcnNpb24iLCJtYWpvclZlcnNpb24iLCJ2ZXJzaW9ucyIsIl9zdXBwb3J0cyIsImZlYXR1cmUiLCJyZXRyaWV2ZSIsImlkcyIsIl9yZXRyaWV2ZU1hbnkiLCJfcmV0cmlldmVQYXJhbGxlbCIsIl9yZXRyaWV2ZVNpbmdsZSIsImZpZWxkcyIsImxlbmd0aCIsImFsbCIsImNhdGNoIiwiYWxsT3JOb25lIiwiZXJyb3JDb2RlIiwiZmllbGQiLCJyZWNvcmRzIiwicmV0IiwiX2NyZWF0ZU1hbnkiLCJfY3JlYXRlUGFyYWxsZWwiLCJfY3JlYXRlU2luZ2xlIiwicmVjb3JkIiwiSWQiLCJydHlwZSIsImF0dHJpYnV0ZXMiLCJyZWMiLCJzb2JqZWN0VHlwZSIsInJlc29sdmUiLCJhbGxvd1JlY3Vyc2l2ZSIsIl9yZWNvcmRzIiwidXBkYXRlIiwiX3VwZGF0ZU1hbnkiLCJfdXBkYXRlUGFyYWxsZWwiLCJfdXBkYXRlU2luZ2xlIiwibm9Db250ZW50UmVzcG9uc2UiLCJ1cHNlcnQiLCJleHRJZEZpZWxkIiwiaXNBcnJheSIsInJlc3VsdHMiLCJleHRJZCIsIl9kZXN0cm95TWFueSIsIl9kZXN0cm95UGFyYWxsZWwiLCJfZGVzdHJveVNpbmdsZSIsIlNPYmplY3QiLCJpZGVudGl0eSIsInVzZXJfaWQiLCJvcmdhbml6YXRpb25faWQiLCJyZWNlbnQiLCJyZWNlbnRJdGVtcyIsInVwZGF0ZWQiLCJzdGFydCIsImVuZCIsIkRhdGUiLCJkZWxldGVkIiwidGFicyIsImxpbWl0cyIsInRoZW1lIiwicXVpY2tBY3Rpb25zIiwicXVpY2tBY3Rpb24iLCJhY3Rpb25OYW1lIiwiUXVpY2tBY3Rpb24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBOztBQUNBOztBQWdDQTs7QUFLQTs7QUFFQTs7QUFFQTs7QUFDQTs7QUFDQTs7QUFHQTs7QUFFQTs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7OztBQXlDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNQSx1QkFNTCxHQUFHO0FBQ0ZDLEVBQUFBLFFBQVEsRUFBRSw4QkFEUjtBQUVGQyxFQUFBQSxXQUFXLEVBQUUsRUFGWDtBQUdGQyxFQUFBQSxPQUFPLEVBQUUsTUFIUDtBQUlGQyxFQUFBQSxRQUFRLEVBQUUsTUFKUjtBQUtGQyxFQUFBQSxVQUFVLEVBQUU7QUFMVixDQU5KO0FBY0E7QUFDQTtBQUNBOztBQUNBLFNBQVNDLEdBQVQsQ0FBYUMsR0FBYixFQUE0QztBQUMxQyxTQUFPQyxNQUFNLENBQUNELEdBQUcsSUFBSSxFQUFSLENBQU4sQ0FDSkUsT0FESSxDQUNJLElBREosRUFDVSxPQURWLEVBRUpBLE9BRkksQ0FFSSxJQUZKLEVBRVUsTUFGVixFQUdKQSxPQUhJLENBR0ksSUFISixFQUdVLE1BSFYsRUFJSkEsT0FKSSxDQUlJLElBSkosRUFJVSxRQUpWLENBQVA7QUFLRDtBQUVEO0FBQ0E7QUFDQTs7O0FBQ0EsU0FBU0Msa0JBQVQsQ0FBNEJDLEVBQTVCLEVBQXNFO0FBQ3BFLE1BQUksT0FBT0EsRUFBUCxLQUFjLFFBQWxCLEVBQTRCO0FBQzFCLFFBQUlBLEVBQUUsQ0FBQyxDQUFELENBQUYsS0FBVSxHQUFkLEVBQW1CO0FBQ2pCO0FBQ0EsYUFBT0MsSUFBSSxDQUFDQyxLQUFMLENB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QTJCOUQsSUFBM0IsQ0FBZ0MsR0FBaEMsQ0FBWjtBQUNBLFVBQU04QixJQUFJLEdBQUcsTUFBTSxLQUFLbUIsT0FBTCxDQUFhbEksR0FBYixDQUFuQjtBQUNBLFdBQU8rRyxJQUFQO0FBQ0Q7QUFFRDtBQUNGO0FBQ0E7OztBQUNFLFFBQU1tRyxZQUFOLEdBQTJEO0FBQ3pELFVBQU1uRyxJQUFJLEdBQUcsTUFBTSxLQUFLbUIsT0FBTCxDQUFhLGVBQWIsQ0FBbkI7QUFDQSxXQUFPbkIsSUFBUDtBQUNEO0FBRUQ7QUFDRjtBQUNBOzs7QUFDRW9HLEVBQUFBLFdBQVcsQ0FBQ0MsVUFBRCxFQUFxQztBQUM5QyxXQUFPLElBQUlDLG9CQUFKLENBQWdCLElBQWhCLEVBQXVCLGlCQUFnQkQsVUFBVyxFQUFsRCxDQUFQO0FBQ0Q7QUFFRDtBQUNGO0FBQ0E7OztBQTV5Q3dFOzs7OEJBQTNEMUwsVSxhQUNNLHVCQUFVLFlBQVYsQztlQSt5Q0pBLFUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKi9cbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQganNmb3JjZSBmcm9tICcuL2pzZm9yY2UnO1xuaW1wb3J0IHtcbiAgSHR0cFJlcXVlc3QsXG4gIEh0dHBSZXNwb25zZSxcbiAgQ2FsbGJhY2ssXG4gIFJlY29yZCxcbiAgU2F2ZVJlc3VsdCxcbiAgVXBzZXJ0UmVzdWx0LFxuICBEZXNjcmliZUdsb2JhbFJlc3VsdCxcbiAgRGVzY3JpYmVTT2JqZWN0UmVzdWx0LFxuICBEZXNjcmliZVRhYixcbiAgRGVzY3JpYmVUaGVtZSxcbiAgRGVzY3JpYmVRdWlja0FjdGlvblJlc3VsdCxcbiAgVXBkYXRlZFJlc3VsdCxcbiAgRGVsZXRlZFJlc3VsdCxcbiAgU2VhcmNoUmVzdWx0LFxuICBPcmdhbml6YXRpb25MaW1pdHNJbmZvLFxuICBPcHRpb25hbCxcbiAgU2lnbmVkUmVxdWVzdE9iamVjdCxcbiAgU2F2ZUVycm9yLFxuICBEbWxPcHRpb25zLFxuICBSZXRyaWV2ZU9wdGlvbnMsXG4gIFNjaGVtYSxcbiAgU09iamVjdE5hbWVzLFxuICBTT2JqZWN0SW5wdXRSZWNvcmQsXG4gIFNPYmplY3RVcGRhdGVSZWNvcmQsXG4gIFNPYmplY3RGaWVsZE5hbWVzLFxuICBVc2VySW5mbyxcbiAgSWRlbnRpdHlJbmZvLFxuICBMaW1pdEluZm8sXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgU3RyZWFtUHJvbWlzZSB9IGZyb20gJy4vdXRpbC9wcm9taXNlJztcbmltcG9ydCBUcmFuc3BvcnQsIHtcbiAgQ2FudmFzVHJhbnNwb3J0LFxuICBYZFByb3h5VHJhbnNwb3J0LFxuICBIdHRwUHJveHlUcmFuc3BvcnQsXG59IGZyb20gJy4vdHJhbnNwb3J0JztcbmltcG9ydCB7IExvZ2dlciwgZ2V0TG9nZ2VyIH0gZnJvbSAnLi91dGlsL2xvZ2dlcic7XG5pbXBvcnQgeyBMb2dMZXZlbENvbmZpZyB9IGZyb20gJy4vdXRpbC9sb2dnZXInO1xuaW1wb3J0IE9BdXRoMiwgeyBUb2tlblJlc3BvbnNlIH0gZnJvbSAnLi9vYXV0aDInO1xuaW1wb3J0IHsgT0F1dGgyQ29uZmlnIH0gZnJvbSAnLi9vYXV0aDInO1xuaW1wb3J0IENhY2hlLCB7IENhY2hlZEZ1bmN0aW9uIH0gZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQgSHR0cEFwaSBmcm9tICcuL2h0dHAtYXBpJztcbmltcG9ydCBTZXNzaW9uUmVmcmVzaERlbGVnYXRlLCB7XG4gIFNlc3Npb25SZWZyZXNoRnVuYyxcbn0gZnJvbSAnLi9zZXNzaW9uLXJlZnJlc2gtZGVsZWdhdGUnO1xuaW1wb3J0IFF1ZXJ5IGZyb20gJy4vcXVlcnknO1xuaW1wb3J0IHsgUXVlcnlPcHRpb25zIH0gZnJvbSAnLi9xdWVyeSc7XG5pbXBvcnQgU09iamVjdCBmcm9tICcuL3NvYmplY3QnO1xuaW1wb3J0IFF1aWNrQWN0aW9uIGZyb20gJy4vcXVpY2stYWN0aW9uJztcbmltcG9ydCBQcm9jZXNzIGZyb20gJy4vcHJvY2Vzcyc7XG5pbXBvcnQgeyBmb3JtYXREYXRlIH0gZnJvbSAnLi91dGlsL2Zvcm1hdHRlcic7XG5pbXBvcnQgQW5hbHl0aWNzIGZyb20gJy4vYXBpL2FuYWx5dGljcyc7XG5pbXBvcnQgQXBleCBmcm9tICcuL2FwaS9hcGV4JztcbmltcG9ydCBCdWxrIGZyb20gJy4vYXBpL2J1bGsnO1xuaW1wb3J0IENoYXR0ZXIgZnJvbSAnLi9hcGkvY2hhdHRlcic7XG5pbXBvcnQgTWV0YWRhdGEgZnJvbSAnLi9hcGkvbWV0YWRhdGEnO1xuaW1wb3J0IFNvYXBBcGkgZnJvbSAnLi9hcGkvc29hcCc7XG5pbXBvcnQgU3RyZWFtaW5nIGZyb20gJy4vYXBpL3N0cmVhbWluZyc7XG5pbXBvcnQgVG9vbGluZyBmcm9tICcuL2FwaS90b29saW5nJztcblxuLyoqXG4gKiB0eXBlIGRlZmluaXRpb25zXG4gKi9cbmV4cG9ydCB0eXBlIENvbm5lY3Rpb25Db25maWc8UyBleHRlbmRzIFNjaGVtYSA9IFNjaGVtYT4gPSB7XG4gIHZlcnNpb24/OiBzdHJpbmc7XG4gIGxvZ2luVXJsPzogc3RyaW5nO1xuICBhY2Nlc3NUb2tlbj86IHN0cmluZztcbiAgcmVmcmVzaFRva2VuPzogc3RyaW5nO1xuICBpbnN0YW5jZVVybD86IHN0cmluZztcbiAgc2Vzc2lvbklkPzogc3RyaW5nO1xuICBzZXJ2ZXJVcmw/OiBzdHJpbmc7XG4gIHNpZ25lZFJlcXVlc3Q/OiBzdHJpbmc7XG4gIG9hdXRoMj86IE9BdXRoMiB8IE9BdXRoMkNvbmZpZztcbiAgbWF4UmVxdWVzdD86IG51bWJlcjtcbiAgcHJveHlVcmw/OiBzdHJpbmc7XG4gIGh0dHBQcm94eT86IHN0cmluZztcbiAgbG9nTGV2ZWw/OiBMb2dMZXZlbENvbmZpZztcbiAgY2FsbE9wdGlvbnM/OiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgcmVmcmVzaEZuPzogU2Vzc2lvblJlZnJlc2hGdW5jPFM+O1xufTtcblxuZXhwb3J0IHR5cGUgQ29ubmVjdGlvbkVzdGFibGlzaE9wdGlvbnMgPSB7XG4gIGFjY2Vzc1Rva2VuPzogT3B0aW9uYWw8c3RyaW5nPjtcbiAgcmVmcmVzaFRva2VuPzogT3B0aW9uYWw8c3RyaW5nPjtcbiAgaW5zdGFuY2VVcmw/OiBPcHRpb25hbDxzdHJpbmc+O1xuICBzZXNzaW9uSWQ/OiBPcHRpb25hbDxzdHJpbmc+O1xuICBzZXJ2ZXJVcmw/OiBPcHRpb25hbDxzdHJpbmc+O1xuICBzaWduZWRSZXF1ZXN0PzogT3B0aW9uYWw8c3RyaW5nIHwgU2lnbmVkUmVxdWVzdE9iamVjdD47XG4gIHVzZXJJbmZvPzogT3B0aW9uYWw8VXNlckluZm8+O1xufTtcblxuLyoqXG4gKlxuICovXG5jb25zdCBkZWZhdWx0Q29ubmVjdGlvbkNvbmZpZzoge1xuICBsb2dpblVybDogc3RyaW5nO1xuICBpbnN0YW5jZVVybDogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGxvZ0xldmVsOiBMb2dMZXZlbENvbmZpZztcbiAgbWF4UmVxdWVzdDogbnVtYmVyO1xufSA9IHtcbiAgbG9naW5Vcmw6ICdodHRwczovL2xvZ2luLnNhbGVzZm9yY2UuY29tJyxcbiAgaW5zdGFuY2VVcmw6ICcnLFxuICB2ZXJzaW9uOiAnNTAuMCcsXG4gIGxvZ0xldmVsOiAnTk9ORScsXG4gIG1heFJlcXVlc3Q6IDEwLFxufTtcblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBlc2Moc3RyOiBPcHRpb25hbDxzdHJpbmc+KTogc3RyaW5nIHtcbiAgcmV0dXJuIFN0cmluZyhzdHIgfHwgJycpXG4gICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG59XG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gcGFyc2VTaWduZWRSZXF1ZXN0KHNyOiBzdHJpbmcgfCBPYmplY3QpOiBTaWduZWRSZXF1ZXN0T2JqZWN0IHtcbiAgaWYgKHR5cGVvZiBzciA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoc3JbMF0gPT09ICd7Jykge1xuICAgICAgLy8gbWlnaHQgYmUgSlNPTlxuICAgICAgcmV0dXJuIEpTT04ucGFyc2Uoc3IpO1xuICAgIH0gLy8gbWlnaHQgYmUgb3JpZ2luYWwgYmFzZTY0LWVuY29kZWQgc2lnbmVkIHJlcXVlc3RcbiAgICBjb25zdCBtc2cgPSBzci5zcGxpdCgnLicpLnBvcCgpOyAvLyByZXRyaWV2ZSBsYXR0ZXIgcGFydFxuICAgIGlmICghbXNnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc2lnbmVkIHJlcXVlc3QnKTtcbiAgICB9XG4gICAgY29uc3QganNvbiA9IEJ1ZmZlci5mcm9tKG1zZywgJ2Jhc2U2NCcpLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIHJldHVybiBKU09OLnBhcnNlKGpzb24pO1xuICB9XG4gIHJldHVybiBzciBhcyBTaWduZWRSZXF1ZXN0T2JqZWN0O1xufVxuXG4vKiogQHByaXZhdGUgKiovXG5mdW5jdGlvbiBwYXJzZUlkVXJsKHVybDogc3RyaW5nKSB7XG4gIGNvbnN0IFtvcmdhbml6YXRpb25JZCwgaWRdID0gdXJsLnNwbGl0KCcvJykuc2xpY2UoLTIpO1xuICByZXR1cm4geyBpZCwgb3JnYW5pemF0aW9uSWQsIHVybCB9O1xufVxuXG4vKipcbiAqIFNlc3Npb24gUmVmcmVzaCBkZWxlZ2F0ZSBmdW5jdGlvbiBmb3IgT0F1dGgyIGF1dGh6IGNvZGUgZmxvd1xuICogQHByaXZhdGVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gb2F1dGhSZWZyZXNoRm48UyBleHRlbmRzIFNjaGVtYT4oXG4gIGNvbm46IENvbm5lY3Rpb248Uz4sXG4gIGNhbGxiYWNrOiBDYWxsYmFjazxzdHJpbmcsIFRva2VuUmVzcG9uc2U+LFxuKSB7XG4gIHRyeSB7XG4gICAgaWYgKCFjb25uLnJlZnJlc2hUb2tlbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyByZWZyZXNoIHRva2VuIGZvdW5kIGluIHRoZSBjb25uZWN0aW9uJyk7XG4gICAgfVxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGNvbm4ub2F1dGgyLnJlZnJlc2hUb2tlbihjb25uLnJlZnJlc2hUb2tlbik7XG4gICAgY29uc3QgdXNlckluZm8gPSBwYXJzZUlkVXJsKHJlcy5pZCk7XG4gICAgY29ubi5fZXN0YWJsaXNoKHtcbiAgICAgIGluc3RhbmNlVXJsOiByZXMuaW5zdGFuY2VfdXJsLFxuICAgICAgYWNjZXNzVG9rZW46IHJlcy5hY2Nlc3NfdG9rZW4sXG4gICAgICB1c2VySW5mbyxcbiAgICB9KTtcbiAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlcy5hY2Nlc3NfdG9rZW4sIHJlcyk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNhbGxiYWNrKGVycik7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXNzaW9uIFJlZnJlc2ggZGVsZWdhdGUgZnVuY3Rpb24gZm9yIHVzZXJuYW1lL3Bhc3N3b3JkIGxvZ2luXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBjcmVhdGVVc2VybmFtZVBhc3N3b3JkUmVmcmVzaEZuPFMgZXh0ZW5kcyBTY2hlbWE+KFxuICB1c2VybmFtZTogc3RyaW5nLFxuICBwYXNzd29yZDogc3RyaW5nLFxuKSB7XG4gIHJldHVybiBhc3luYyAoXG4gICAgY29ubjogQ29ubmVjdGlvbjxTPixcbiAgICBjYWxsYmFjazogQ2FsbGJhY2s8c3RyaW5nLCBUb2tlblJlc3BvbnNlPixcbiAgKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNvbm4ubG9naW4odXNlcm5hbWUsIHBhc3N3b3JkKTtcbiAgICAgIGlmICghY29ubi5hY2Nlc3NUb2tlbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FjY2VzcyB0b2tlbiBub3QgZm91bmQgYWZ0ZXIgbG9naW4nKTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIGNvbm4uYWNjZXNzVG9rZW4pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gdG9TYXZlUmVzdWx0KGVycjogU2F2ZUVycm9yKTogU2F2ZVJlc3VsdCB7XG4gIHJldHVybiB7XG4gICAgc3VjY2VzczogZmFsc2UsXG4gICAgZXJyb3JzOiBbZXJyXSxcbiAgfTtcbn1cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiByYWlzZU5vTW9kdWxlRXJyb3IobmFtZTogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgYEFQSSBtb2R1bGUgJyR7bmFtZX0nIGlzIG5vdCBsb2FkZWQsIGxvYWQgJ2pzZm9yY2UvYXBpLyR7bmFtZX0nIGV4cGxpY2l0bHlgLFxuICApO1xufVxuXG4vKlxuICogQ29uc3RhbnQgb2YgbWF4aW11bSByZWNvcmRzIG51bSBpbiBETUwgb3BlcmF0aW9uICh1cGRhdGUvZGVsZXRlKVxuICovXG5jb25zdCBNQVhfRE1MX0NPVU5UID0gMjAwO1xuXG4vKipcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBDb25uZWN0aW9uPFMgZXh0ZW5kcyBTY2hlbWEgPSBTY2hlbWE+IGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgc3RhdGljIF9sb2dnZXIgPSBnZXRMb2dnZXIoJ2Nvbm5lY3Rpb24nKTtcblxuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGxvZ2luVXJsOiBzdHJpbmc7XG4gIGluc3RhbmNlVXJsOiBzdHJpbmc7XG4gIGFjY2Vzc1Rva2VuOiBPcHRpb25hbDxzdHJpbmc+O1xuICByZWZyZXNoVG9rZW46IE9wdGlvbmFsPHN0cmluZz47XG4gIHVzZXJJbmZvOiBPcHRpb25hbDxVc2VySW5mbz47XG4gIGxpbWl0SW5mbzogTGltaXRJbmZvID0ge307XG4gIG9hdXRoMjogT0F1dGgyO1xuICBzb2JqZWN0czogeyBbTiBpbiBTT2JqZWN0TmFtZXM8Uz5dPzogU09iamVjdDxTLCBOPiB9ID0ge307XG4gIGNhY2hlOiBDYWNoZTtcbiAgX2NhbGxPcHRpb25zOiBPcHRpb25hbDx7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfT47XG4gIF9tYXhSZXF1ZXN0OiBudW1iZXI7XG4gIF9sb2dnZXI6IExvZ2dlcjtcbiAgX2xvZ0xldmVsOiBPcHRpb25hbDxMb2dMZXZlbENvbmZpZz47XG4gIF90cmFuc3BvcnQ6IFRyYW5zcG9ydDtcbiAgX3Nlc3Npb25UeXBlOiBPcHRpb25hbDwnc29hcCcgfCAnb2F1dGgyJz47XG4gIF9yZWZyZXNoRGVsZWdhdGU6IE9wdGlvbmFsPFNlc3Npb25SZWZyZXNoRGVsZWdhdGU8Uz4+O1xuXG4gIC8vIGRlc2NyaWJlOiAobmFtZTogc3RyaW5nKSA9PiBQcm9taXNlPERlc2NyaWJlU09iamVjdFJlc3VsdD47XG4gIGRlc2NyaWJlJDogQ2FjaGVkRnVuY3Rpb248KG5hbWU6IHN0cmluZykgPT4gUHJvbWlzZTxEZXNjcmliZVNPYmplY3RSZXN1bHQ+PjtcbiAgZGVzY3JpYmUkJDogQ2FjaGVkRnVuY3Rpb248KG5hbWU6IHN0cmluZykgPT4gRGVzY3JpYmVTT2JqZWN0UmVzdWx0PjtcbiAgZGVzY3JpYmVTT2JqZWN0OiAobmFtZTogc3RyaW5nKSA9PiBQcm9taXNlPERlc2NyaWJlU09iamVjdFJlc3VsdD47XG4gIGRlc2NyaWJlU09iamVjdCQ6IENhY2hlZEZ1bmN0aW9uPFxuICAgIChuYW1lOiBzdHJpbmcpID0+IFByb21pc2U8RGVzY3JpYmVTT2JqZWN0UmVzdWx0PlxuICA+O1xuICBkZXNjcmliZVNPYmplY3QkJDogQ2FjaGVkRnVuY3Rpb248KG5hbWU6IHN0cmluZykgPT4gRGVzY3JpYmVTT2JqZWN0UmVzdWx0PjtcbiAgLy8gZGVzY3JpYmVHbG9iYWw6ICgpID0+IFByb21pc2U8RGVzY3JpYmVHbG9iYWxSZXN1bHQ+O1xuICBkZXNjcmliZUdsb2JhbCQ6IENhY2hlZEZ1bmN0aW9uPCgpID0+IFByb21pc2U8RGVzY3JpYmVHbG9iYWxSZXN1bHQ+PjtcbiAgZGVzY3JpYmVHbG9iYWwkJDogQ2FjaGVkRnVuY3Rpb248KCkgPT4gRGVzY3JpYmVHbG9iYWxSZXN1bHQ+O1xuXG4gIC8vIEFQSSBsaWJzIGFyZSBub3QgaW5zdGFudGlhdGVkIGhlcmUgc28gdGhhdCBjb3JlIG1vZHVsZSB0byByZW1haW4gd2l0aG91dCBkZXBlbmRlbmNpZXMgdG8gdGhlbVxuICAvLyBJdCBpcyByZXNwb25zaWJsZSBmb3IgZGV2ZWxwZXJzIHRvIGltcG9ydCBhcGkgbGlicyBleHBsaWNpdGx5IGlmIHRoZXkgYXJlIHVzaW5nICdqc2ZvcmNlL2NvcmUnIGluc3RlYWQgb2YgJ2pzZm9yY2UnLlxuICBnZXQgYW5hbHl0aWNzKCk6IEFuYWx5dGljczxTPiB7XG4gICAgcmV0dXJuIHJhaXNlTm9Nb2R1bGVFcnJvcignYW5hbHl0aWNzJyk7XG4gIH1cblxuICBnZXQgYXBleCgpOiBBcGV4PFM+IHtcbiAgICByZXR1cm4gcmFpc2VOb01vZHVsZUVycm9yKCdhcGV4Jyk7XG4gIH1cblxuICBnZXQgYnVsaygpOiBCdWxrPFM+IHtcbiAgICByZXR1cm4gcmFpc2VOb01vZHVsZUVycm9yKCdidWxrJyk7XG4gIH1cblxuICBnZXQgY2hhdHRlcigpOiBDaGF0dGVyPFM+IHtcbiAgICByZXR1cm4gcmFpc2VOb01vZHVsZUVycm9yKCdjaGF0dGVyJyk7XG4gIH1cblxuICBnZXQgbWV0YWRhdGEoKTogTWV0YWRhdGE8Uz4ge1xuICAgIHJldHVybiByYWlzZU5vTW9kdWxlRXJyb3IoJ21ldGFkYXRhJyk7XG4gIH1cblxuICBnZXQgc29hcCgpOiBTb2FwQXBpPFM+IHtcbiAgICByZXR1cm4gcmFpc2VOb01vZHVsZUVycm9yKCdzb2FwJyk7XG4gIH1cblxuICBnZXQgc3RyZWFtaW5nKCk6IFN0cmVhbWluZzxTPiB7XG4gICAgcmV0dXJuIHJhaXNlTm9Nb2R1bGVFcnJvcignc3RyZWFtaW5nJyk7XG4gIH1cblxuICBnZXQgdG9vbGluZygpOiBUb29saW5nPFM+IHtcbiAgICByZXR1cm4gcmFpc2VOb01vZHVsZUVycm9yKCd0b29saW5nJyk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogQ29ubmVjdGlvbkNvbmZpZzxTPiA9IHt9KSB7XG4gICAgc3VwZXIoKTtcbiAgICBjb25zdCB7XG4gICAgICBsb2dpblVybCxcbiAgICAgIGluc3RhbmNlVXJsLFxuICAgICAgdmVyc2lvbixcbiAgICAgIG9hdXRoMixcbiAgICAgIG1heFJlcXVlc3QsXG4gICAgICBsb2dMZXZlbCxcbiAgICAgIHByb3h5VXJsLFxuICAgICAgaHR0cFByb3h5LFxuICAgIH0gPSBjb25maWc7XG4gICAgdGhpcy5sb2dpblVybCA9IGxvZ2luVXJsIHx8IGRlZmF1bHRDb25uZWN0aW9uQ29uZmlnLmxvZ2luVXJsO1xuICAgIHRoaXMuaW5zdGFuY2VVcmwgPSBpbnN0YW5jZVVybCB8fCBkZWZhdWx0Q29ubmVjdGlvbkNvbmZpZy5pbnN0YW5jZVVybDtcbiAgICB0aGlzLnZlcnNpb24gPSB2ZXJzaW9uIHx8IGRlZmF1bHRDb25uZWN0aW9uQ29uZmlnLnZlcnNpb247XG4gICAgdGhpcy5vYXV0aDIgPVxuICAgICAgb2F1dGgyIGluc3RhbmNlb2YgT0F1dGgyXG4gICAgICAgID8gb2F1dGgyXG4gICAgICAgIDogbmV3IE9BdXRoMih7XG4gICAgICAgICAgICBsb2dpblVybDogdGhpcy5sb2dpblVybCxcbiAgICAgICAgICAgIHByb3h5VXJsLFxuICAgICAgICAgICAgaHR0cFByb3h5LFxuICAgICAgICAgICAgLi4ub2F1dGgyLFxuICAgICAgICAgIH0pO1xuICAgIGxldCByZWZyZXNoRm4gPSBjb25maWcucmVmcmVzaEZuO1xuICAgIGlmICghcmVmcmVzaEZuICYmIHRoaXMub2F1dGgyLmNsaWVudElkKSB7XG4gICAgICByZWZyZXNoRm4gPSBvYXV0aFJlZnJlc2hGbjtcbiAgICB9XG4gICAgaWYgKHJlZnJlc2hGbikge1xuICAgICAgdGhpcy5fcmVmcmVzaERlbGVnYXRlID0gbmV3IFNlc3Npb25SZWZyZXNoRGVsZWdhdGUodGhpcywgcmVmcmVzaEZuKTtcbiAgICB9XG4gICAgdGhpcy5fbWF4UmVxdWVzdCA9IG1heFJlcXVlc3QgfHwgZGVmYXVsdENvbm5lY3Rpb25Db25maWcubWF4UmVxdWVzdDtcbiAgICB0aGlzLl9sb2dnZXIgPSBsb2dMZXZlbFxuICAgICAgPyBDb25uZWN0aW9uLl9sb2dnZXIuY3JlYXRlSW5zdGFuY2UobG9nTGV2ZWwpXG4gICAgICA6IENvbm5lY3Rpb24uX2xvZ2dlcjtcbiAgICB0aGlzLl9sb2dMZXZlbCA9IGxvZ0xldmVsO1xuICAgIHRoaXMuX3RyYW5zcG9ydCA9IHByb3h5VXJsXG4gICAgICA/IG5ldyBYZFByb3h5VHJhbnNwb3J0KHByb3h5VXJsKVxuICAgICAgOiBodHRwUHJveHlcbiAgICAgID8gbmV3IEh0dHBQcm94eVRyYW5zcG9ydChodHRwUHJveHkpXG4gICAgICA6IG5ldyBUcmFuc3BvcnQoKTtcbiAgICB0aGlzLl9jYWxsT3B0aW9ucyA9IGNvbmZpZy5jYWxsT3B0aW9ucztcbiAgICB0aGlzLmNhY2hlID0gbmV3IENhY2hlKCk7XG4gICAgY29uc3QgZGVzY3JpYmVDYWNoZUtleSA9ICh0eXBlPzogc3RyaW5nKSA9PlxuICAgICAgdHlwZSA/IGBkZXNjcmliZS4ke3R5cGV9YCA6ICdkZXNjcmliZSc7XG4gICAgY29uc3QgZGVzY3JpYmUgPSBDb25uZWN0aW9uLnByb3RvdHlwZS5kZXNjcmliZTtcbiAgICB0aGlzLmRlc2NyaWJlID0gdGhpcy5jYWNoZS5jcmVhdGVDYWNoZWRGdW5jdGlvbihkZXNjcmliZSwgdGhpcywge1xuICAgICAga2V5OiBkZXNjcmliZUNhY2hlS2V5LFxuICAgICAgc3RyYXRlZ3k6ICdOT0NBQ0hFJyxcbiAgICB9KTtcbiAgICB0aGlzLmRlc2NyaWJlJCA9IHRoaXMuY2FjaGUuY3JlYXRlQ2FjaGVkRnVuY3Rpb24oZGVzY3JpYmUsIHRoaXMsIHtcbiAgICAgIGtleTogZGVzY3JpYmVDYWNoZUtleSxcbiAgICAgIHN0cmF0ZWd5OiAnSElUJyxcbiAgICB9KTtcbiAgICB0aGlzLmRlc2NyaWJlJCQgPSB0aGlzLmNhY2hlLmNyZWF0ZUNhY2hlZEZ1bmN0aW9uKGRlc2NyaWJlLCB0aGlzLCB7XG4gICAgICBrZXk6IGRlc2NyaWJlQ2FjaGVLZXksXG4gICAgICBzdHJhdGVneTogJ0lNTUVESUFURScsXG4gICAgfSkgYXMgYW55O1xuICAgIHRoaXMuZGVzY3JpYmVTT2JqZWN0ID0gdGhpcy5kZXNjcmliZTtcbiAgICB0aGlzLmRlc2NyaWJlU09iamVjdCQgPSB0aGlzLmRlc2NyaWJlJDtcbiAgICB0aGlzLmRlc2NyaWJlU09iamVjdCQkID0gdGhpcy5kZXNjcmliZSQkO1xuICAgIGNvbnN0IGRlc2NyaWJlR2xvYmFsID0gQ29ubmVjdGlvbi5wcm90b3R5cGUuZGVzY3JpYmVHbG9iYWw7XG4gICAgdGhpcy5kZXNjcmliZUdsb2JhbCA9IHRoaXMuY2FjaGUuY3JlYXRlQ2FjaGVkRnVuY3Rpb24oXG4gICAgICBkZXNjcmliZUdsb2JhbCxcbiAgICAgIHRoaXMsXG4gICAgICB7IGtleTogJ2Rlc2NyaWJlR2xvYmFsJywgc3RyYXRlZ3k6ICdOT0NBQ0hFJyB9LFxuICAgICk7XG4gICAgdGhpcy5kZXNjcmliZUdsb2JhbCQgPSB0aGlzLmNhY2hlLmNyZWF0ZUNhY2hlZEZ1bmN0aW9uKFxuICAgICAgZGVzY3JpYmVHbG9iYWwsXG4gICAgICB0aGlzLFxuICAgICAgeyBrZXk6ICdkZXNjcmliZUdsb2JhbCcsIHN0cmF0ZWd5OiAnSElUJyB9LFxuICAgICk7XG4gICAgdGhpcy5kZXNjcmliZUdsb2JhbCQkID0gdGhpcy5jYWNoZS5jcmVhdGVDYWNoZWRGdW5jdGlvbihcbiAgICAgIGRlc2NyaWJlR2xvYmFsLFxuICAgICAgdGhpcyxcbiAgICAgIHsga2V5OiAnZGVzY3JpYmVHbG9iYWwnLCBzdHJhdGVneTogJ0lNTUVESUFURScgfSxcbiAgICApIGFzIGFueTtcbiAgICBjb25zdCB7XG4gICAgICBhY2Nlc3NUb2tlbixcbiAgICAgIHJlZnJlc2hUb2tlbixcbiAgICAgIHNlc3Npb25JZCxcbiAgICAgIHNlcnZlclVybCxcbiAgICAgIHNpZ25lZFJlcXVlc3QsXG4gICAgfSA9IGNvbmZpZztcbiAgICB0aGlzLl9lc3RhYmxpc2goe1xuICAgICAgYWNjZXNzVG9rZW4sXG4gICAgICByZWZyZXNoVG9rZW4sXG4gICAgICBpbnN0YW5jZVVybCxcbiAgICAgIHNlc3Npb25JZCxcbiAgICAgIHNlcnZlclVybCxcbiAgICAgIHNpZ25lZFJlcXVlc3QsXG4gICAgfSk7XG5cbiAgICBqc2ZvcmNlLmVtaXQoJ2Nvbm5lY3Rpb246bmV3JywgdGhpcyk7XG4gIH1cblxuICAvKiBAcHJpdmF0ZSAqL1xuICBfZXN0YWJsaXNoKG9wdGlvbnM6IENvbm5lY3Rpb25Fc3RhYmxpc2hPcHRpb25zKSB7XG4gICAgY29uc3Qge1xuICAgICAgYWNjZXNzVG9rZW4sXG4gICAgICByZWZyZXNoVG9rZW4sXG4gICAgICBpbnN0YW5jZVVybCxcbiAgICAgIHNlc3Npb25JZCxcbiAgICAgIHNlcnZlclVybCxcbiAgICAgIHNpZ25lZFJlcXVlc3QsXG4gICAgICB1c2VySW5mbyxcbiAgICB9ID0gb3B0aW9ucztcbiAgICB0aGlzLmluc3RhbmNlVXJsID0gc2VydmVyVXJsXG4gICAgICA/IHNlcnZlclVybC5zcGxpdCgnLycpLnNsaWNlKDAsIDMpLmpvaW4oJy8nKVxuICAgICAgOiBpbnN0YW5jZVVybCB8fCB0aGlzLmluc3RhbmNlVXJsO1xuICAgIHRoaXMuYWNjZXNzVG9rZW4gPSBzZXNzaW9uSWQgfHwgYWNjZXNzVG9rZW4gfHwgdGhpcy5hY2Nlc3NUb2tlbjtcbiAgICB0aGlzLnJlZnJlc2hUb2tlbiA9IHJlZnJlc2hUb2tlbiB8fCB0aGlzLnJlZnJlc2hUb2tlbjtcbiAgICBpZiAodGhpcy5yZWZyZXNoVG9rZW4gJiYgIXRoaXMuX3JlZnJlc2hEZWxlZ2F0ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnUmVmcmVzaCB0b2tlbiBpcyBzcGVjaWZpZWQgd2l0aG91dCBvYXV0aDIgY2xpZW50IGluZm9ybWF0aW9uIG9yIHJlZnJlc2ggZnVuY3Rpb24nLFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3Qgc2lnbmVkUmVxdWVzdE9iamVjdCA9XG4gICAgICBzaWduZWRSZXF1ZXN0ICYmIHBhcnNlU2lnbmVkUmVxdWVzdChzaWduZWRSZXF1ZXN0KTtcbiAgICBpZiAoc2lnbmVkUmVxdWVzdE9iamVjdCkge1xuICAgICAgdGhpcy5hY2Nlc3NUb2tlbiA9IHNpZ25lZFJlcXVlc3RPYmplY3QuY2xpZW50Lm9hdXRoVG9rZW47XG4gICAgICBpZiAoQ2FudmFzVHJhbnNwb3J0LnN1cHBvcnRlZCkge1xuICAgICAgICB0aGlzLl90cmFuc3BvcnQgPSBuZXcgQ2FudmFzVHJhbnNwb3J0KHNpZ25lZFJlcXVlc3RPYmplY3QpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnVzZXJJbmZvID0gdXNlckluZm8gfHwgdGhpcy51c2VySW5mbztcbiAgICB0aGlzLl9zZXNzaW9uVHlwZSA9IHNlc3Npb25JZCA/ICdzb2FwJyA6ICdvYXV0aDInO1xuICAgIHRoaXMuX3Jlc2V0SW5zdGFuY2UoKTtcbiAgfVxuXG4gIC8qIEBwcml2ZWF0ZSAqL1xuICBfY2xlYXJTZXNzaW9uKCkge1xuICAgIHRoaXMuYWNjZXNzVG9rZW4gPSBudWxsO1xuICAgIHRoaXMucmVmcmVzaFRva2VuID0gbnVsbDtcbiAgICB0aGlzLmluc3RhbmNlVXJsID0gZGVmYXVsdENvbm5lY3Rpb25Db25maWcuaW5zdGFuY2VVcmw7XG4gICAgdGhpcy51c2VySW5mbyA9IG51bGw7XG4gICAgdGhpcy5fc2Vzc2lvblR5cGUgPSBudWxsO1xuICB9XG5cbiAgLyogQHByaXZlYXRlICovXG4gIF9yZXNldEluc3RhbmNlKCkge1xuICAgIHRoaXMubGltaXRJbmZvID0ge307XG4gICAgdGhpcy5zb2JqZWN0cyA9IHt9O1xuICAgIC8vIFRPRE8gaW1wbCBjYWNoZVxuICAgIHRoaXMuY2FjaGUuY2xlYXIoKTtcbiAgICB0aGlzLmNhY2hlLmdldCgnZGVzY3JpYmVHbG9iYWwnKS5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3ZhbHVlJyk7XG4gICAgdGhpcy5jYWNoZS5nZXQoJ2Rlc2NyaWJlR2xvYmFsJykub24oJ3ZhbHVlJywgKHsgcmVzdWx0IH0pID0+IHtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgZm9yIChjb25zdCBzbyBvZiByZXN1bHQuc29iamVjdHMpIHtcbiAgICAgICAgICB0aGlzLnNvYmplY3Qoc28ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvKlxuICAgIGlmICh0aGlzLnRvb2xpbmcpIHtcbiAgICAgIHRoaXMudG9vbGluZy5fcmVzZXRJbnN0YW5jZSgpO1xuICAgIH1cbiAgICAqL1xuICB9XG5cbiAgLyoqXG4gICAqIEF1dGhvcml6ZSAodXNpbmcgb2F1dGgyIHdlYiBzZXJ2ZXIgZmxvdylcbiAgICovXG4gIGFzeW5jIGF1dGhvcml6ZShcbiAgICBjb2RlOiBzdHJpbmcsXG4gICAgcGFyYW1zOiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9LFxuICApOiBQcm9taXNlPFVzZXJJbmZvPiB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5vYXV0aDIucmVxdWVzdFRva2VuKGNvZGUsIHBhcmFtcyk7XG4gICAgY29uc3QgdXNlckluZm8gPSBwYXJzZUlkVXJsKHJlcy5pZCk7XG4gICAgdGhpcy5fZXN0YWJsaXNoKHtcbiAgICAgIGluc3RhbmNlVXJsOiByZXMuaW5zdGFuY2VfdXJsLFxuICAgICAgYWNjZXNzVG9rZW46IHJlcy5hY2Nlc3NfdG9rZW4sXG4gICAgICByZWZyZXNoVG9rZW46IHJlcy5yZWZyZXNoX3Rva2VuLFxuICAgICAgdXNlckluZm8sXG4gICAgfSk7XG4gICAgdGhpcy5fbG9nZ2VyLmRlYnVnKFxuICAgICAgYDxsb2dpbj4gY29tcGxldGVkLiB1c2VyIGlkID0gJHt1c2VySW5mby5pZH0sIG9yZyBpZCA9ICR7dXNlckluZm8ub3JnYW5pemF0aW9uSWR9YCxcbiAgICApO1xuICAgIHJldHVybiB1c2VySW5mbztcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgYXN5bmMgbG9naW4odXNlcm5hbWU6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyk6IFByb21pc2U8VXNlckluZm8+IHtcbiAgICB0aGlzLl9yZWZyZXNoRGVsZWdhdGUgPSBuZXcgU2Vzc2lvblJlZnJlc2hEZWxlZ2F0ZShcbiAgICAgIHRoaXMsXG4gICAgICBjcmVhdGVVc2VybmFtZVBhc3N3b3JkUmVmcmVzaEZuKHVzZXJuYW1lLCBwYXNzd29yZCksXG4gICAgKTtcbiAgICBpZiAodGhpcy5vYXV0aDIgJiYgdGhpcy5vYXV0aDIuY2xpZW50SWQgJiYgdGhpcy5vYXV0aDIuY2xpZW50U2VjcmV0KSB7XG4gICAgICByZXR1cm4gdGhpcy5sb2dpbkJ5T0F1dGgyKHVzZXJuYW1lLCBwYXNzd29yZCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxvZ2luQnlTb2FwKHVzZXJuYW1lLCBwYXNzd29yZCk7XG4gIH1cblxuICAvKipcbiAgICogTG9naW4gYnkgT0F1dGgyIHVzZXJuYW1lICYgcGFzc3dvcmQgZmxvd1xuICAgKi9cbiAgYXN5bmMgbG9naW5CeU9BdXRoMih1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxVc2VySW5mbz4ge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMub2F1dGgyLmF1dGhlbnRpY2F0ZSh1c2VybmFtZSwgcGFzc3dvcmQpO1xuICAgIGNvbnN0IHVzZXJJbmZvID0gcGFyc2VJZFVybChyZXMuaWQpO1xuICAgIHRoaXMuX2VzdGFibGlzaCh7XG4gICAgICBpbnN0YW5jZVVybDogcmVzLmluc3RhbmNlX3VybCxcbiAgICAgIGFjY2Vzc1Rva2VuOiByZXMuYWNjZXNzX3Rva2VuLFxuICAgICAgdXNlckluZm8sXG4gICAgfSk7XG4gICAgdGhpcy5fbG9nZ2VyLmluZm8oXG4gICAgICBgPGxvZ2luPiBjb21wbGV0ZWQuIHVzZXIgaWQgPSAke3VzZXJJbmZvLmlkfSwgb3JnIGlkID0gJHt1c2VySW5mby5vcmdhbml6YXRpb25JZH1gLFxuICAgICk7XG4gICAgcmV0dXJuIHVzZXJJbmZvO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBhc3luYyBsb2dpbkJ5U29hcCh1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxVc2VySW5mbz4ge1xuICAgIGlmICghdXNlcm5hbWUgfHwgIXBhc3N3b3JkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdubyB1c2VybmFtZSBwYXNzd29yZCBnaXZlbicpKTtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IFtcbiAgICAgICc8c2U6RW52ZWxvcGUgeG1sbnM6c2U9XCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy9zb2FwL2VudmVsb3BlL1wiPicsXG4gICAgICAnPHNlOkhlYWRlci8+JyxcbiAgICAgICc8c2U6Qm9keT4nLFxuICAgICAgJzxsb2dpbiB4bWxucz1cInVybjpwYXJ0bmVyLnNvYXAuc2ZvcmNlLmNvbVwiPicsXG4gICAgICBgPHVzZXJuYW1lPiR7ZXNjKHVzZXJuYW1lKX08L3VzZXJuYW1lPmAsXG4gICAgICBgPHBhc3N3b3JkPiR7ZXNjKHBhc3N3b3JkKX08L3Bhc3N3b3JkPmAsXG4gICAgICAnPC9sb2dpbj4nLFxuICAgICAgJzwvc2U6Qm9keT4nLFxuICAgICAgJzwvc2U6RW52ZWxvcGU+JyxcbiAgICBdLmpvaW4oJycpO1xuXG4gICAgY29uc3Qgc29hcExvZ2luRW5kcG9pbnQgPSBbXG4gICAgICB0aGlzLmxvZ2luVXJsLFxuICAgICAgJ3NlcnZpY2VzL1NvYXAvdScsXG4gICAgICB0aGlzLnZlcnNpb24sXG4gICAgXS5qb2luKCcvJyk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLl90cmFuc3BvcnQuaHR0cFJlcXVlc3Qoe1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICB1cmw6IHNvYXBMb2dpbkVuZHBvaW50LFxuICAgICAgYm9keSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3htbCcsXG4gICAgICAgIFNPQVBBY3Rpb246ICdcIlwiJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgbGV0IG07XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPj0gNDAwKSB7XG4gICAgICBtID0gcmVzcG9uc2UuYm9keS5tYXRjaCgvPGZhdWx0c3RyaW5nPihbXjxdKyk8XFwvZmF1bHRzdHJpbmc+Lyk7XG4gICAgICBjb25zdCBmYXVsdHN0cmluZyA9IG0gJiYgbVsxXTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihmYXVsdHN0cmluZyB8fCByZXNwb25zZS5ib2R5KTtcbiAgICB9XG4gICAgdGhpcy5fbG9nZ2VyLmRlYnVnKGBTT0FQIHJlc3BvbnNlID0gJHtyZXNwb25zZS5ib2R5fWApO1xuICAgIG0gPSByZXNwb25zZS5ib2R5Lm1hdGNoKC88c2VydmVyVXJsPihbXjxdKyk8XFwvc2VydmVyVXJsPi8pO1xuICAgIGNvbnN0IHNlcnZlclVybCA9IG0gJiYgbVsxXTtcbiAgICBtID0gcmVzcG9uc2UuYm9keS5tYXRjaCgvPHNlc3Npb25JZD4oW148XSspPFxcL3Nlc3Npb25JZD4vKTtcbiAgICBjb25zdCBzZXNzaW9uSWQgPSBtICYmIG1bMV07XG4gICAgbSA9IHJlc3BvbnNlLmJvZHkubWF0Y2goLzx1c2VySWQ+KFtePF0rKTxcXC91c2VySWQ+Lyk7XG4gICAgY29uc3QgdXNlcklkID0gbSAmJiBtWzFdO1xuICAgIG0gPSByZXNwb25zZS5ib2R5Lm1hdGNoKC88b3JnYW5pemF0aW9uSWQ+KFtePF0rKTxcXC9vcmdhbml6YXRpb25JZD4vKTtcbiAgICBjb25zdCBvcmdhbml6YXRpb25JZCA9IG0gJiYgbVsxXTtcbiAgICBpZiAoIXNlcnZlclVybCB8fCAhc2Vzc2lvbklkIHx8ICF1c2VySWQgfHwgIW9yZ2FuaXphdGlvbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdjb3VsZCBub3QgZXh0cmFjdCBzZXNzaW9uIGluZm9ybWF0aW9uIGZyb20gbG9naW4gcmVzcG9uc2UnLFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgaWRVcmwgPSBbdGhpcy5sb2dpblVybCwgJ2lkJywgb3JnYW5pemF0aW9uSWQsIHVzZXJJZF0uam9pbignLycpO1xuICAgIGNvbnN0IHVzZXJJbmZvID0geyBpZDogdXNlcklkLCBvcmdhbml6YXRpb25JZCwgdXJsOiBpZFVybCB9O1xuICAgIHRoaXMuX2VzdGFibGlzaCh7XG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybC5zcGxpdCgnLycpLnNsaWNlKDAsIDMpLmpvaW4oJy8nKSxcbiAgICAgIHNlc3Npb25JZCxcbiAgICAgIHVzZXJJbmZvLFxuICAgIH0pO1xuICAgIHRoaXMuX2xvZ2dlci5pbmZvKFxuICAgICAgYDxsb2dpbj4gY29tcGxldGVkLiB1c2VyIGlkID0gJHt1c2VySWR9LCBvcmcgaWQgPSAke29yZ2FuaXphdGlvbklkfWAsXG4gICAgKTtcbiAgICByZXR1cm4gdXNlckluZm87XG4gIH1cblxuICAvKipcbiAgICogTG9nb3V0IHRoZSBjdXJyZW50IHNlc3Npb25cbiAgICovXG4gIGFzeW5jIGxvZ291dChyZXZva2U/OiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5fcmVmcmVzaERlbGVnYXRlID0gdW5kZWZpbmVkO1xuICAgIGlmICh0aGlzLl9zZXNzaW9uVHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgIHJldHVybiB0aGlzLmxvZ291dEJ5T0F1dGgyKHJldm9rZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxvZ291dEJ5U29hcChyZXZva2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ291dCB0aGUgY3VycmVudCBzZXNzaW9uIGJ5IHJldm9raW5nIGFjY2VzcyB0b2tlbiB2aWEgT0F1dGgyIHNlc3Npb24gcmV2b2tlXG4gICAqL1xuICBhc3luYyBsb2dvdXRCeU9BdXRoMihyZXZva2U/OiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdG9rZW4gPSByZXZva2UgPyB0aGlzLnJlZnJlc2hUb2tlbiA6IHRoaXMuYWNjZXNzVG9rZW47XG4gICAgaWYgKHRva2VuKSB7XG4gICAgICBhd2FpdCB0aGlzLm9hdXRoMi5yZXZva2VUb2tlbih0b2tlbik7XG4gICAgfVxuICAgIC8vIERlc3Ryb3kgdGhlIHNlc3Npb24gYm91bmQgdG8gdGhpcyBjb25uZWN0aW9uXG4gICAgdGhpcy5fY2xlYXJTZXNzaW9uKCk7XG4gICAgdGhpcy5fcmVzZXRJbnN0YW5jZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ291dCB0aGUgc2Vzc2lvbiBieSB1c2luZyBTT0FQIHdlYiBzZXJ2aWNlIEFQSVxuICAgKi9cbiAgYXN5bmMgbG9nb3V0QnlTb2FwKHJldm9rZT86IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBib2R5ID0gW1xuICAgICAgJzxzZTpFbnZlbG9wZSB4bWxuczpzZT1cImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3NvYXAvZW52ZWxvcGUvXCI+JyxcbiAgICAgICc8c2U6SGVhZGVyPicsXG4gICAgICAnPFNlc3Npb25IZWFkZXIgeG1sbnM9XCJ1cm46cGFydG5lci5zb2FwLnNmb3JjZS5jb21cIj4nLFxuICAgICAgYDxzZXNzaW9uSWQ+JHtlc2MoXG4gICAgICAgIHJldm9rZSA/IHRoaXMucmVmcmVzaFRva2VuIDogdGhpcy5hY2Nlc3NUb2tlbixcbiAgICAgICl9PC9zZXNzaW9uSWQ+YCxcbiAgICAgICc8L1Nlc3Npb25IZWFkZXI+JyxcbiAgICAgICc8L3NlOkhlYWRlcj4nLFxuICAgICAgJzxzZTpCb2R5PicsXG4gICAgICAnPGxvZ291dCB4bWxucz1cInVybjpwYXJ0bmVyLnNvYXAuc2ZvcmNlLmNvbVwiLz4nLFxuICAgICAgJzwvc2U6Qm9keT4nLFxuICAgICAgJzwvc2U6RW52ZWxvcGU+JyxcbiAgICBdLmpvaW4oJycpO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5fdHJhbnNwb3J0Lmh0dHBSZXF1ZXN0KHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgdXJsOiBbdGhpcy5pbnN0YW5jZVVybCwgJ3NlcnZpY2VzL1NvYXAvdScsIHRoaXMudmVyc2lvbl0uam9pbignLycpLFxuICAgICAgYm9keSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3htbCcsXG4gICAgICAgIFNPQVBBY3Rpb246ICdcIlwiJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGhpcy5fbG9nZ2VyLmRlYnVnKFxuICAgICAgYFNPQVAgc3RhdHVzQ29kZSA9ICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX0sIHJlc3BvbnNlID0gJHtyZXNwb25zZS5ib2R5fWAsXG4gICAgKTtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSA0MDApIHtcbiAgICAgIGNvbnN0IG0gPSByZXNwb25zZS5ib2R5Lm1hdGNoKC88ZmF1bHRzdHJpbmc+KFtePF0rKTxcXC9mYXVsdHN0cmluZz4vKTtcbiAgICAgIGNvbnN0IGZhdWx0c3RyaW5nID0gbSAmJiBtWzFdO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGZhdWx0c3RyaW5nIHx8IHJlc3BvbnNlLmJvZHkpO1xuICAgIH1cbiAgICAvLyBEZXN0cm95IHRoZSBzZXNzaW9uIGJvdW5kIHRvIHRoaXMgY29ubmVjdGlvblxuICAgIHRoaXMuX2NsZWFyU2Vzc2lvbigpO1xuICAgIHRoaXMuX3Jlc2V0SW5zdGFuY2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIFJFU1QgQVBJIHJlcXVlc3Qgd2l0aCBnaXZlbiBIVFRQIHJlcXVlc3QgaW5mbywgd2l0aCBjb25uZWN0ZWQgc2Vzc2lvbiBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogRW5kcG9pbnQgVVJMIGNhbiBiZSBhYnNvbHV0ZSBVUkwgKCdodHRwczovL25hMS5zYWxlc2ZvcmNlLmNvbS9zZXJ2aWNlcy9kYXRhL3YzMi4wL3NvYmplY3RzL0FjY291bnQvZGVzY3JpYmUnKVxuICAgKiAsIHJlbGF0aXZlIHBhdGggZnJvbSByb290ICgnL3NlcnZpY2VzL2RhdGEvdjMyLjAvc29iamVjdHMvQWNjb3VudC9kZXNjcmliZScpXG4gICAqICwgb3IgcmVsYXRpdmUgcGF0aCBmcm9tIHZlcnNpb24gcm9vdCAoJy9zb2JqZWN0cy9BY2NvdW50L2Rlc2NyaWJlJykuXG4gICAqL1xuICByZXF1ZXN0PFIgPSB1bmtub3duPihcbiAgICByZXF1ZXN0OiBzdHJpbmcgfCBIdHRwUmVxdWVzdCxcbiAgICBvcHRpb25zOiBPYmplY3QgPSB7fSxcbiAgKTogU3RyZWFtUHJvbWlzZTxSPiB7XG4gICAgLy8gaWYgcmVxdWVzdCBpcyBzaW1wbGUgc3RyaW5nLCByZWdhcmQgaXQgYXMgdXJsIGluIEdFVCBtZXRob2RcbiAgICBsZXQgcmVxdWVzdF86IEh0dHBSZXF1ZXN0ID1cbiAgICAgIHR5cGVvZiByZXF1ZXN0ID09PSAnc3RyaW5nJyA/IHsgbWV0aG9kOiAnR0VUJywgdXJsOiByZXF1ZXN0IH0gOiByZXF1ZXN0O1xuICAgIC8vIGlmIHVybCBpcyBnaXZlbiBpbiByZWxhdGl2ZSBwYXRoLCBwcmVwZW5kIGJhc2UgdXJsIG9yIGluc3RhbmNlIHVybCBiZWZvcmUuXG4gICAgcmVxdWVzdF8gPSB7XG4gICAgICAuLi5yZXF1ZXN0XyxcbiAgICAgIHVybDogdGhpcy5fbm9ybWFsaXplVXJsKHJlcXVlc3RfLnVybCksXG4gICAgfTtcbiAgICBjb25zdCBodHRwQXBpID0gbmV3IEh0dHBBcGkodGhpcywgb3B0aW9ucyk7XG4gICAgLy8gbG9nIGFwaSB1c2FnZSBhbmQgaXRzIHF1b3RhXG4gICAgaHR0cEFwaS5vbigncmVzcG9uc2UnLCAocmVzcG9uc2U6IEh0dHBSZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKHJlc3BvbnNlLmhlYWRlcnMgJiYgcmVzcG9uc2UuaGVhZGVyc1snc2ZvcmNlLWxpbWl0LWluZm8nXSkge1xuICAgICAgICBjb25zdCBhcGlVc2FnZSA9IHJlc3BvbnNlLmhlYWRlcnNbJ3Nmb3JjZS1saW1pdC1pbmZvJ10ubWF0Y2goXG4gICAgICAgICAgL2FwaS11c2FnZT0oXFxkKylcXC8oXFxkKykvLFxuICAgICAgICApO1xuICAgICAgICBpZiAoYXBpVXNhZ2UpIHtcbiAgICAgICAgICB0aGlzLmxpbWl0SW5mbyA9IHtcbiAgICAgICAgICAgIGFwaVVzYWdlOiB7XG4gICAgICAgICAgICAgIHVzZWQ6IHBhcnNlSW50KGFwaVVzYWdlWzFdLCAxMCksXG4gICAgICAgICAgICAgIGxpbWl0OiBwYXJzZUludChhcGlVc2FnZVsyXSwgMTApLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGh0dHBBcGkucmVxdWVzdDxSPihyZXF1ZXN0Xyk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBIVFRQIEdFVCByZXF1ZXN0XG4gICAqXG4gICAqIEVuZHBvaW50IFVSTCBjYW4gYmUgYWJzb2x1dGUgVVJMICgnaHR0cHM6Ly9uYTEuc2FsZXNmb3JjZS5jb20vc2VydmljZXMvZGF0YS92MzIuMC9zb2JqZWN0cy9BY2NvdW50L2Rlc2NyaWJlJylcbiAgICogLCByZWxhdGl2ZSBwYXRoIGZyb20gcm9vdCAoJy9zZXJ2aWNlcy9kYXRhL3YzMi4wL3NvYmplY3RzL0FjY291bnQvZGVzY3JpYmUnKVxuICAgKiAsIG9yIHJlbGF0aXZlIHBhdGggZnJvbSB2ZXJzaW9uIHJvb3QgKCcvc29iamVjdHMvQWNjb3VudC9kZXNjcmliZScpLlxuICAgKi9cbiAgcmVxdWVzdEdldDxSID0gdW5rbm93bj4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBPYmplY3QpIHtcbiAgICBjb25zdCByZXF1ZXN0OiBIdHRwUmVxdWVzdCA9IHsgbWV0aG9kOiAnR0VUJywgdXJsIH07XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdDxSPihyZXF1ZXN0LCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIEhUVFAgUE9TVCByZXF1ZXN0IHdpdGggSlNPTiBib2R5LCB3aXRoIGNvbm5lY3RlZCBzZXNzaW9uIGluZm9ybWF0aW9uXG4gICAqXG4gICAqIEVuZHBvaW50IFVSTCBjYW4gYmUgYWJzb2x1dGUgVVJMICgnaHR0cHM6Ly9uYTEuc2FsZXNmb3JjZS5jb20vc2VydmljZXMvZGF0YS92MzIuMC9zb2JqZWN0cy9BY2NvdW50L2Rlc2NyaWJlJylcbiAgICogLCByZWxhdGl2ZSBwYXRoIGZyb20gcm9vdCAoJy9zZXJ2aWNlcy9kYXRhL3YzMi4wL3NvYmplY3RzL0FjY291bnQvZGVzY3JpYmUnKVxuICAgKiAsIG9yIHJlbGF0aXZlIHBhdGggZnJvbSB2ZXJzaW9uIHJvb3QgKCcvc29iamVjdHMvQWNjb3VudC9kZXNjcmliZScpLlxuICAgKi9cbiAgcmVxdWVzdFBvc3Q8UiA9IHVua25vd24+KHVybDogc3RyaW5nLCBib2R5OiBPYmplY3QsIG9wdGlvbnM/OiBPYmplY3QpIHtcbiAgICBjb25zdCByZXF1ZXN0OiBIdHRwUmVxdWVzdCA9IHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgdXJsLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSksXG4gICAgICBoZWFkZXJzOiB7ICdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3Q8Uj4ocmVxdWVzdCwgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBIVFRQIFBVVCByZXF1ZXN0IHdpdGggSlNPTiBib2R5LCB3aXRoIGNvbm5lY3RlZCBzZXNzaW9uIGluZm9ybWF0aW9uXG4gICAqXG4gICAqIEVuZHBvaW50IFVSTCBjYW4gYmUgYWJzb2x1dGUgVVJMICgnaHR0cHM6Ly9uYTEuc2FsZXNmb3JjZS5jb20vc2VydmljZXMvZGF0YS92MzIuMC9zb2JqZWN0cy9BY2NvdW50L2Rlc2NyaWJlJylcbiAgICogLCByZWxhdGl2ZSBwYXRoIGZyb20gcm9vdCAoJy9zZXJ2aWNlcy9kYXRhL3YzMi4wL3NvYmplY3RzL0FjY291bnQvZGVzY3JpYmUnKVxuICAgKiAsIG9yIHJlbGF0aXZlIHBhdGggZnJvbSB2ZXJzaW9uIHJvb3QgKCcvc29iamVjdHMvQWNjb3VudC9kZXNjcmliZScpLlxuICAgKi9cbiAgcmVxdWVzdFB1dDxSPih1cmw6IHN0cmluZywgYm9keTogT2JqZWN0LCBvcHRpb25zPzogT2JqZWN0KSB7XG4gICAgY29uc3QgcmVxdWVzdDogSHR0cFJlcXVlc3QgPSB7XG4gICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgdXJsLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSksXG4gICAgICBoZWFkZXJzOiB7ICdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3Q8Uj4ocmVxdWVzdCwgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBIVFRQIFBBVENIIHJlcXVlc3Qgd2l0aCBKU09OIGJvZHlcbiAgICpcbiAgICogRW5kcG9pbnQgVVJMIGNhbiBiZSBhYnNvbHV0ZSBVUkwgKCdodHRwczovL25hMS5zYWxlc2ZvcmNlLmNvbS9zZXJ2aWNlcy9kYXRhL3YzMi4wL3NvYmplY3RzL0FjY291bnQvZGVzY3JpYmUnKVxuICAgKiAsIHJlbGF0aXZlIHBhdGggZnJvbSByb290ICgnL3NlcnZpY2VzL2RhdGEvdjMyLjAvc29iamVjdHMvQWNjb3VudC9kZXNjcmliZScpXG4gICAqICwgb3IgcmVsYXRpdmUgcGF0aCBmcm9tIHZlcnNpb24gcm9vdCAoJy9zb2JqZWN0cy9BY2NvdW50L2Rlc2NyaWJlJykuXG4gICAqL1xuICByZXF1ZXN0UGF0Y2g8UiA9IHVua25vd24+KHVybDogc3RyaW5nLCBib2R5OiBPYmplY3QsIG9wdGlvbnM/OiBPYmplY3QpIHtcbiAgICBjb25zdCByZXF1ZXN0OiBIdHRwUmVxdWVzdCA9IHtcbiAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgIHVybCxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpLFxuICAgICAgaGVhZGVyczogeyAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0PFI+KHJlcXVlc3QsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgSFRUUCBERUxFVEUgcmVxdWVzdFxuICAgKlxuICAgKiBFbmRwb2ludCBVUkwgY2FuIGJlIGFic29sdXRlIFVSTCAoJ2h0dHBzOi8vbmExLnNhbGVzZm9yY2UuY29tL3NlcnZpY2VzL2RhdGEvdjMyLjAvc29iamVjdHMvQWNjb3VudC9kZXNjcmliZScpXG4gICAqICwgcmVsYXRpdmUgcGF0aCBmcm9tIHJvb3QgKCcvc2VydmljZXMvZGF0YS92MzIuMC9zb2JqZWN0cy9BY2NvdW50L2Rlc2NyaWJlJylcbiAgICogLCBvciByZWxhdGl2ZSBwYXRoIGZyb20gdmVyc2lvbiByb290ICgnL3NvYmplY3RzL0FjY291bnQvZGVzY3JpYmUnKS5cbiAgICovXG4gIHJlcXVlc3REZWxldGU8Uj4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBPYmplY3QpIHtcbiAgICBjb25zdCByZXF1ZXN0OiBIdHRwUmVxdWVzdCA9IHsgbWV0aG9kOiAnREVMRVRFJywgdXJsIH07XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdDxSPihyZXF1ZXN0LCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqKi9cbiAgX2Jhc2VVcmwoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmluc3RhbmNlVXJsLCAnc2VydmljZXMvZGF0YScsIGB2JHt0aGlzLnZlcnNpb259YF0uam9pbignLycpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgcGF0aCB0byBhYnNvbHV0ZSB1cmxcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ub3JtYWxpemVVcmwodXJsOiBzdHJpbmcpIHtcbiAgICBpZiAodXJsWzBdID09PSAnLycpIHtcbiAgICAgIGlmICh1cmwuaW5kZXhPZignL3NlcnZpY2VzLycpID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlVXJsICsgdXJsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX2Jhc2VVcmwoKSArIHVybDtcbiAgICB9XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgcXVlcnk8VCBleHRlbmRzIFJlY29yZD4oXG4gICAgc29xbDogc3RyaW5nLFxuICAgIG9wdGlvbnM/OiBQYXJ0aWFsPFF1ZXJ5T3B0aW9ucz4sXG4gICk6IFF1ZXJ5PFMsIFNPYmplY3ROYW1lczxTPiwgVCwgJ1F1ZXJ5UmVzdWx0Jz4ge1xuICAgIHJldHVybiBuZXcgUXVlcnk8UywgU09iamVjdE5hbWVzPFM+LCBULCAnUXVlcnlSZXN1bHQnPih0aGlzLCBzb3FsLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHNlYXJjaCBieSBTT1NMXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzb3NsIC0gU09TTCBzdHJpbmdcbiAgICogQHBhcmFtIHtDYWxsYmFjay48QXJyYXkuPFJlY29yZFJlc3VsdD4+fSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICogQHJldHVybnMge1Byb21pc2UuPEFycmF5LjxSZWNvcmRSZXN1bHQ+Pn1cbiAgICovXG4gIHNlYXJjaChzb3NsOiBzdHJpbmcpIHtcbiAgICB2YXIgdXJsID0gdGhpcy5fYmFzZVVybCgpICsgJy9zZWFyY2g/cT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNvc2wpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3Q8U2VhcmNoUmVzdWx0Pih1cmwpO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBxdWVyeU1vcmUobG9jYXRvcjogc3RyaW5nLCBvcHRpb25zPzogUXVlcnlPcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBRdWVyeTxTLCBTT2JqZWN0TmFtZXM8Uz4sIFJlY29yZCwgJ1F1ZXJ5UmVzdWx0Jz4oXG4gICAgICB0aGlzLFxuICAgICAgeyBsb2NhdG9yIH0sXG4gICAgICBvcHRpb25zLFxuICAgICk7XG4gIH1cblxuICAvKiAqL1xuICBfZW5zdXJlVmVyc2lvbihtYWpvclZlcnNpb246IG51bWJlcikge1xuICAgIGNvbnN0IHZlcnNpb25zID0gdGhpcy52ZXJzaW9uLnNwbGl0KCcuJyk7XG4gICAgcmV0dXJuIHBhcnNlSW50KHZlcnNpb25zWzBdLCAxMCkgPj0gbWFqb3JWZXJzaW9uO1xuICB9XG5cbiAgLyogKi9cbiAgX3N1cHBvcnRzKGZlYXR1cmU6IHN0cmluZykge1xuICAgIHN3aXRjaCAoZmVhdHVyZSkge1xuICAgICAgY2FzZSAnc29iamVjdC1jb2xsZWN0aW9uJzogLy8gc29iamVjdCBjb2xsZWN0aW9uIGlzIGF2YWlsYWJsZSBvbmx5IGluIEFQSSB2ZXIgNDIuMCtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Vuc3VyZVZlcnNpb24oNDIpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBzcGVjaWZpZWQgcmVjb3Jkc1xuICAgKi9cbiAgcmV0cmlldmU8TiBleHRlbmRzIFNPYmplY3ROYW1lczxTPj4oXG4gICAgdHlwZTogTixcbiAgICBpZHM6IHN0cmluZyxcbiAgICBvcHRpb25zPzogUmV0cmlldmVPcHRpb25zLFxuICApOiBQcm9taXNlPFJlY29yZD47XG4gIHJldHJpZXZlPE4gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4+KFxuICAgIHR5cGU6IE4sXG4gICAgaWRzOiBzdHJpbmdbXSxcbiAgICBvcHRpb25zPzogUmV0cmlldmVPcHRpb25zLFxuICApOiBQcm9taXNlPFJlY29yZFtdPjtcbiAgcmV0cmlldmU8TiBleHRlbmRzIFNPYmplY3ROYW1lczxTPj4oXG4gICAgdHlwZTogTixcbiAgICBpZHM6IHN0cmluZyB8IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM/OiBSZXRyaWV2ZU9wdGlvbnMsXG4gICk6IFByb21pc2U8UmVjb3JkIHwgUmVjb3JkW10+O1xuICBhc3luYyByZXRyaWV2ZShcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgaWRzOiBzdHJpbmcgfCBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiBSZXRyaWV2ZU9wdGlvbnMgPSB7fSxcbiAgKSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaWRzKVxuICAgICAgPyAvLyBjaGVjayB0aGUgdmVyc2lvbiB3aGV0aGVyIFNPYmplY3QgY29sbGVjdGlvbiBBUEkgaXMgc3VwcG9ydGVkICg0Mi4wKVxuICAgICAgICB0aGlzLl9lbnN1cmVWZXJzaW9uKDQyKVxuICAgICAgICA/IHRoaXMuX3JldHJpZXZlTWFueSh0eXBlLCBpZHMsIG9wdGlvbnMpXG4gICAgICAgIDogdGhpcy5fcmV0cmlldmVQYXJhbGxlbCh0eXBlLCBpZHMsIG9wdGlvbnMpXG4gICAgICA6IHRoaXMuX3JldHJpZXZlU2luZ2xlKHR5cGUsIGlkcywgb3B0aW9ucyk7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgYXN5bmMgX3JldHJpZXZlU2luZ2xlKHR5cGU6IHN0cmluZywgaWQ6IHN0cmluZywgb3B0aW9uczogUmV0cmlldmVPcHRpb25zKSB7XG4gICAgaWYgKCFpZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlY29yZCBJRC4gU3BlY2lmeSB2YWxpZCByZWNvcmQgSUQgdmFsdWUnKTtcbiAgICB9XG4gICAgbGV0IHVybCA9IFt0aGlzLl9iYXNlVXJsKCksICdzb2JqZWN0cycsIHR5cGUsIGlkXS5qb2luKCcvJyk7XG4gICAgY29uc3QgeyBmaWVsZHMsIGhlYWRlcnMgfSA9IG9wdGlvbnM7XG4gICAgaWYgKGZpZWxkcykge1xuICAgICAgdXJsICs9IGA/ZmllbGRzPSR7ZmllbGRzLmpvaW4oJywnKX1gO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KHsgbWV0aG9kOiAnR0VUJywgdXJsLCBoZWFkZXJzIH0pO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIGFzeW5jIF9yZXRyaWV2ZVBhcmFsbGVsKFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBpZHM6IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM6IFJldHJpZXZlT3B0aW9ucyxcbiAgKSB7XG4gICAgaWYgKGlkcy5sZW5ndGggPiB0aGlzLl9tYXhSZXF1ZXN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4Y2VlZGVkIG1heCBsaW1pdCBvZiBjb25jdXJyZW50IGNhbGwnKTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgaWRzLm1hcCgoaWQpID0+XG4gICAgICAgIHRoaXMuX3JldHJpZXZlU2luZ2xlKHR5cGUsIGlkLCBvcHRpb25zKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuYWxsT3JOb25lIHx8IGVyci5lcnJvckNvZGUgIT09ICdOT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBhc3luYyBfcmV0cmlldmVNYW55KHR5cGU6IHN0cmluZywgaWRzOiBzdHJpbmdbXSwgb3B0aW9uczogUmV0cmlldmVPcHRpb25zKSB7XG4gICAgaWYgKGlkcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgdXJsID0gW3RoaXMuX2Jhc2VVcmwoKSwgJ2NvbXBvc2l0ZScsICdzb2JqZWN0cycsIHR5cGVdLmpvaW4oJy8nKTtcbiAgICBjb25zdCBmaWVsZHMgPVxuICAgICAgb3B0aW9ucy5maWVsZHMgfHxcbiAgICAgIChhd2FpdCB0aGlzLmRlc2NyaWJlJCh0eXBlKSkuZmllbGRzLm1hcCgoZmllbGQpID0+IGZpZWxkLm5hbWUpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3Qoe1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICB1cmwsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGlkcywgZmllbGRzIH0pLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAuLi4ob3B0aW9ucy5oZWFkZXJzIHx8IHt9KSxcbiAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHJlY29yZHNcbiAgICovXG4gIGNyZWF0ZTxcbiAgICBOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+LFxuICAgIElucHV0UmVjb3JkIGV4dGVuZHMgU09iamVjdElucHV0UmVjb3JkPFMsIE4+ID0gU09iamVjdElucHV0UmVjb3JkPFMsIE4+XG4gID4oXG4gICAgdHlwZTogTixcbiAgICByZWNvcmRzOiBJbnB1dFJlY29yZFtdLFxuICAgIG9wdGlvbnM/OiBEbWxPcHRpb25zLFxuICApOiBQcm9taXNlPFNhdmVSZXN1bHRbXT47XG4gIGNyZWF0ZTxcbiAgICBOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+LFxuICAgIElucHV0UmVjb3JkIGV4dGVuZHMgU09iamVjdElucHV0UmVjb3JkPFMsIE4+ID0gU09iamVjdElucHV0UmVjb3JkPFMsIE4+XG4gID4odHlwZTogTiwgcmVjb3JkOiBJbnB1dFJlY29yZCwgb3B0aW9ucz86IERtbE9wdGlvbnMpOiBQcm9taXNlPFNhdmVSZXN1bHQ+O1xuICBjcmVhdGU8XG4gICAgTiBleHRlbmRzIFNPYmplY3ROYW1lczxTPixcbiAgICBJbnB1dFJlY29yZCBleHRlbmRzIFNPYmplY3RJbnB1dFJlY29yZDxTLCBOPiA9IFNPYmplY3RJbnB1dFJlY29yZDxTLCBOPlxuICA+KFxuICAgIHR5cGU6IE4sXG4gICAgcmVjb3JkczogSW5wdXRSZWNvcmQgfCBJbnB1dFJlY29yZFtdLFxuICAgIG9wdGlvbnM/OiBEbWxPcHRpb25zLFxuICApOiBQcm9taXNlPFNhdmVSZXN1bHQgfCBTYXZlUmVzdWx0W10+O1xuICAvKipcbiAgICogQHBhcmFtIHR5cGVcbiAgICogQHBhcmFtIHJlY29yZHNcbiAgICogQHBhcmFtIG9wdGlvbnNcbiAgICovXG4gIGFzeW5jIGNyZWF0ZShcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgcmVjb3JkczogUmVjb3JkIHwgUmVjb3JkW10sXG4gICAgb3B0aW9uczogRG1sT3B0aW9ucyA9IHt9LFxuICApIHtcbiAgICBjb25zdCByZXQgPSBBcnJheS5pc0FycmF5KHJlY29yZHMpXG4gICAgICA/IC8vIGNoZWNrIHRoZSB2ZXJzaW9uIHdoZXRoZXIgU09iamVjdCBjb2xsZWN0aW9uIEFQSSBpcyBzdXBwb3J0ZWQgKDQyLjApXG4gICAgICAgIHRoaXMuX2Vuc3VyZVZlcnNpb24oNDIpXG4gICAgICAgID8gYXdhaXQgdGhpcy5fY3JlYXRlTWFueSh0eXBlLCByZWNvcmRzLCBvcHRpb25zKVxuICAgICAgICA6IGF3YWl0IHRoaXMuX2NyZWF0ZVBhcmFsbGVsKHR5cGUsIHJlY29yZHMsIG9wdGlvbnMpXG4gICAgICA6IGF3YWl0IHRoaXMuX2NyZWF0ZVNpbmdsZSh0eXBlLCByZWNvcmRzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIGFzeW5jIF9jcmVhdGVTaW5nbGUodHlwZTogc3RyaW5nLCByZWNvcmQ6IFJlY29yZCwgb3B0aW9uczogRG1sT3B0aW9ucykge1xuICAgIGNvbnN0IHsgSWQsIHR5cGU6IHJ0eXBlLCBhdHRyaWJ1dGVzLCAuLi5yZWMgfSA9IHJlY29yZDtcbiAgICBjb25zdCBzb2JqZWN0VHlwZSA9IHR5cGUgfHwgKGF0dHJpYnV0ZXMgJiYgYXR0cmlidXRlcy50eXBlKSB8fCBydHlwZTtcbiAgICBpZiAoIXNvYmplY3RUeXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIFNPYmplY3QgVHlwZSBkZWZpbmVkIGluIHJlY29yZCcpO1xuICAgIH1cbiAgICBjb25zdCB1cmwgPSBbdGhpcy5fYmFzZVVybCgpLCAnc29iamVjdHMnLCBzb2JqZWN0VHlwZV0uam9pbignLycpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3Qoe1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICB1cmwsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZWMpLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAuLi4ob3B0aW9ucy5oZWFkZXJzIHx8IHt9KSxcbiAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgYXN5bmMgX2NyZWF0ZVBhcmFsbGVsKHR5cGU6IHN0cmluZywgcmVjb3JkczogUmVjb3JkW10sIG9wdGlvbnM6IERtbE9wdGlvbnMpIHtcbiAgICBpZiAocmVjb3Jkcy5sZW5ndGggPiB0aGlzLl9tYXhSZXF1ZXN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4Y2VlZGVkIG1heCBsaW1pdCBvZiBjb25jdXJyZW50IGNhbGwnKTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgcmVjb3Jkcy5tYXAoKHJlY29yZCkgPT5cbiAgICAgICAgdGhpcy5fY3JlYXRlU2luZ2xlKHR5cGUsIHJlY29yZCwgb3B0aW9ucykuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIC8vIGJlIGF3YXJlIHRoYXQgYWxsT3JOb25lIGluIHBhcmFsbGVsIG1vZGUgd2lsbCBub3QgcmV2ZXJ0IHRoZSBvdGhlciBzdWNjZXNzZnVsIHJlcXVlc3RzXG4gICAgICAgICAgLy8gaXQgb25seSByYWlzZXMgZXJyb3Igd2hlbiBtZXQgYXQgbGVhc3Qgb25lIGZhaWxlZCByZXF1ZXN0LlxuICAgICAgICAgIGlmIChvcHRpb25zLmFsbE9yTm9uZSB8fCAhZXJyLmVycm9yQ29kZSkge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdG9TYXZlUmVzdWx0KGVycik7XG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIGFzeW5jIF9jcmVhdGVNYW55KFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICByZWNvcmRzOiBSZWNvcmRbXSxcbiAgICBvcHRpb25zOiBEbWxPcHRpb25zLFxuICApOiBQcm9taXNlPFNhdmVSZXN1bHRbXT4ge1xuICAgIGlmIChyZWNvcmRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG4gICAgfVxuICAgIGlmIChyZWNvcmRzLmxlbmd0aCA+IE1BWF9ETUxfQ09VTlQgJiYgb3B0aW9ucy5hbGxvd1JlY3Vyc2l2ZSkge1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgLi4uKGF3YWl0IHRoaXMuX2NyZWF0ZU1hbnkoXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICByZWNvcmRzLnNsaWNlKDAsIE1BWF9ETUxfQ09VTlQpLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICkpLFxuICAgICAgICAuLi4oYXdhaXQgdGhpcy5fY3JlYXRlTWFueShcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIHJlY29yZHMuc2xpY2UoTUFYX0RNTF9DT1VOVCksXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgKSksXG4gICAgICBdO1xuICAgIH1cbiAgICBjb25zdCBfcmVjb3JkcyA9IHJlY29yZHMubWFwKChyZWNvcmQpID0+IHtcbiAgICAgIGNvbnN0IHsgSWQsIHR5cGU6IHJ0eXBlLCBhdHRyaWJ1dGVzLCAuLi5yZWMgfSA9IHJlY29yZDtcbiAgICAgIGNvbnN0IHNvYmplY3RUeXBlID0gdHlwZSB8fCAoYXR0cmlidXRlcyAmJiBhdHRyaWJ1dGVzLnR5cGUpIHx8IHJ0eXBlO1xuICAgICAgaWYgKCFzb2JqZWN0VHlwZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIFNPYmplY3QgVHlwZSBkZWZpbmVkIGluIHJlY29yZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHsgYXR0cmlidXRlczogeyB0eXBlOiBzb2JqZWN0VHlwZSB9LCAuLi5yZWMgfTtcbiAgICB9KTtcbiAgICBjb25zdCB1cmwgPSBbdGhpcy5fYmFzZVVybCgpLCAnY29tcG9zaXRlJywgJ3NvYmplY3RzJ10uam9pbignLycpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3Qoe1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICB1cmwsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGFsbE9yTm9uZTogb3B0aW9ucy5hbGxPck5vbmUgfHwgZmFsc2UsXG4gICAgICAgIHJlY29yZHM6IF9yZWNvcmRzLFxuICAgICAgfSksXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIC4uLihvcHRpb25zLmhlYWRlcnMgfHwge30pLFxuICAgICAgICAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTeW5vbnltIG9mIENvbm5lY3Rpb24jY3JlYXRlKClcbiAgICovXG4gIGluc2VydCA9IHRoaXMuY3JlYXRlO1xuXG4gIC8qKlxuICAgKiBVcGRhdGUgcmVjb3Jkc1xuICAgKi9cbiAgdXBkYXRlPFxuICAgIE4gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4sXG4gICAgVXBkYXRlUmVjb3JkIGV4dGVuZHMgU09iamVjdFVwZGF0ZVJlY29yZDxTLCBOPiA9IFNPYmplY3RVcGRhdGVSZWNvcmQ8UywgTj5cbiAgPihcbiAgICB0eXBlOiBOLFxuICAgIHJlY29yZHM6IFVwZGF0ZVJlY29yZFtdLFxuICAgIG9wdGlvbnM/OiBEbWxPcHRpb25zLFxuICApOiBQcm9taXNlPFNhdmVSZXN1bHRbXT47XG4gIHVwZGF0ZTxcbiAgICBOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+LFxuICAgIFVwZGF0ZVJlY29yZCBleHRlbmRzIFNPYmplY3RVcGRhdGVSZWNvcmQ8UywgTj4gPSBTT2JqZWN0VXBkYXRlUmVjb3JkPFMsIE4+XG4gID4odHlwZTogTiwgcmVjb3JkOiBVcGRhdGVSZWNvcmQsIG9wdGlvbnM/OiBEbWxPcHRpb25zKTogUHJvbWlzZTxTYXZlUmVzdWx0PjtcbiAgdXBkYXRlPFxuICAgIE4gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4sXG4gICAgVXBkYXRlUmVjb3JkIGV4dGVuZHMgU09iamVjdFVwZGF0ZVJlY29yZDxTLCBOPiA9IFNPYmplY3RVcGRhdGVSZWNvcmQ8UywgTj5cbiAgPihcbiAgICB0eXBlOiBOLFxuICAgIHJlY29yZHM6IFVwZGF0ZVJlY29yZCB8IFVwZGF0ZVJlY29yZFtdLFxuICAgIG9wdGlvbnM/OiBEbWxPcHRpb25zLFxuICApOiBQcm9taXNlPFNhdmVSZXN1bHQgfCBTYXZlUmVzdWx0W10+O1xuICAvKipcbiAgICogQHBhcmFtIHR5cGVcbiAgICogQHBhcmFtIHJlY29yZHNcbiAgICogQHBhcmFtIG9wdGlvbnNcbiAgICovXG4gIHVwZGF0ZTxOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+PihcbiAgICB0eXBlOiBOLFxuICAgIHJlY29yZHM6IFJlY29yZCB8IFJlY29yZFtdLFxuICAgIG9wdGlvbnM6IERtbE9wdGlvbnMgPSB7fSxcbiAgKTogUHJvbWlzZTxTYXZlUmVzdWx0IHwgU2F2ZVJlc3VsdFtdPiB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkocmVjb3JkcylcbiAgICAgID8gLy8gY2hlY2sgdGhlIHZlcnNpb24gd2hldGhlciBTT2JqZWN0IGNvbGxlY3Rpb24gQVBJIGlzIHN1cHBvcnRlZCAoNDIuMClcbiAgICAgICAgdGhpcy5fZW5zdXJlVmVyc2lvbig0MilcbiAgICAgICAgPyB0aGlzLl91cGRhdGVNYW55KHR5cGUsIHJlY29yZHMsIG9wdGlvbnMpXG4gICAgICAgIDogdGhpcy5fdXBkYXRlUGFyYWxsZWwodHlwZSwgcmVjb3Jkcywgb3B0aW9ucylcbiAgICAgIDogdGhpcy5fdXBkYXRlU2luZ2xlKHR5cGUsIHJlY29yZHMsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIGFzeW5jIF91cGRhdGVTaW5nbGUoXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIHJlY29yZDogUmVjb3JkLFxuICAgIG9wdGlvbnM6IERtbE9wdGlvbnMsXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdD4ge1xuICAgIGNvbnN0IHsgSWQ6IGlkLCB0eXBlOiBydHlwZSwgYXR0cmlidXRlcywgLi4ucmVjIH0gPSByZWNvcmQ7XG4gICAgaWYgKCFpZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWNvcmQgaWQgaXMgbm90IGZvdW5kIGluIHJlY29yZC4nKTtcbiAgICB9XG4gICAgY29uc3Qgc29iamVjdFR5cGUgPSB0eXBlIHx8IChhdHRyaWJ1dGVzICYmIGF0dHJpYnV0ZXMudHlwZSkgfHwgcnR5cGU7XG4gICAgaWYgKCFzb2JqZWN0VHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBTT2JqZWN0IFR5cGUgZGVmaW5lZCBpbiByZWNvcmQnKTtcbiAgICB9XG4gICAgY29uc3QgdXJsID0gW3RoaXMuX2Jhc2VVcmwoKSwgJ3NvYmplY3RzJywgc29iamVjdFR5cGUsIGlkXS5qb2luKCcvJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICB1cmwsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlYyksXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi4ob3B0aW9ucy5oZWFkZXJzIHx8IHt9KSxcbiAgICAgICAgICAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbm9Db250ZW50UmVzcG9uc2U6IHsgaWQsIHN1Y2Nlc3M6IHRydWUsIGVycm9yczogW10gfSxcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBhc3luYyBfdXBkYXRlUGFyYWxsZWwodHlwZTogc3RyaW5nLCByZWNvcmRzOiBSZWNvcmRbXSwgb3B0aW9uczogRG1sT3B0aW9ucykge1xuICAgIGlmIChyZWNvcmRzLmxlbmd0aCA+IHRoaXMuX21heFJlcXVlc3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRXhjZWVkZWQgbWF4IGxpbWl0IG9mIGNvbmN1cnJlbnQgY2FsbCcpO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICByZWNvcmRzLm1hcCgocmVjb3JkKSA9PlxuICAgICAgICB0aGlzLl91cGRhdGVTaW5nbGUodHlwZSwgcmVjb3JkLCBvcHRpb25zKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgLy8gYmUgYXdhcmUgdGhhdCBhbGxPck5vbmUgaW4gcGFyYWxsZWwgbW9kZSB3aWxsIG5vdCByZXZlcnQgdGhlIG90aGVyIHN1Y2Nlc3NmdWwgcmVxdWVzdHNcbiAgICAgICAgICAvLyBpdCBvbmx5IHJhaXNlcyBlcnJvciB3aGVuIG1ldCBhdCBsZWFzdCBvbmUgZmFpbGVkIHJlcXVlc3QuXG4gICAgICAgICAgaWYgKG9wdGlvbnMuYWxsT3JOb25lIHx8ICFlcnIuZXJyb3JDb2RlKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0b1NhdmVSZXN1bHQoZXJyKTtcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgYXN5bmMgX3VwZGF0ZU1hbnkoXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIHJlY29yZHM6IFJlY29yZFtdLFxuICAgIG9wdGlvbnM6IERtbE9wdGlvbnMsXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdFtdPiB7XG4gICAgaWYgKHJlY29yZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmIChyZWNvcmRzLmxlbmd0aCA+IE1BWF9ETUxfQ09VTlQgJiYgb3B0aW9ucy5hbGxvd1JlY3Vyc2l2ZSkge1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgLi4uKGF3YWl0IHRoaXMuX3VwZGF0ZU1hbnkoXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICByZWNvcmRzLnNsaWNlKDAsIE1BWF9ETUxfQ09VTlQpLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICkpLFxuICAgICAgICAuLi4oYXdhaXQgdGhpcy5fdXBkYXRlTWFueShcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIHJlY29yZHMuc2xpY2UoTUFYX0RNTF9DT1VOVCksXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgKSksXG4gICAgICBdO1xuICAgIH1cbiAgICBjb25zdCBfcmVjb3JkcyA9IHJlY29yZHMubWFwKChyZWNvcmQpID0+IHtcbiAgICAgIGNvbnN0IHsgSWQ6IGlkLCB0eXBlOiBydHlwZSwgYXR0cmlidXRlcywgLi4ucmVjIH0gPSByZWNvcmQ7XG4gICAgICBpZiAoIWlkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVjb3JkIGlkIGlzIG5vdCBmb3VuZCBpbiByZWNvcmQuJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBzb2JqZWN0VHlwZSA9IHR5cGUgfHwgKGF0dHJpYnV0ZXMgJiYgYXR0cmlidXRlcy50eXBlKSB8fCBydHlwZTtcbiAgICAgIGlmICghc29iamVjdFR5cGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBTT2JqZWN0IFR5cGUgZGVmaW5lZCBpbiByZWNvcmQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7IGlkLCBhdHRyaWJ1dGVzOiB7IHR5cGU6IHNvYmplY3RUeXBlIH0sIC4uLnJlYyB9O1xuICAgIH0pO1xuICAgIGNvbnN0IHVybCA9IFt0aGlzLl9iYXNlVXJsKCksICdjb21wb3NpdGUnLCAnc29iamVjdHMnXS5qb2luKCcvJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh7XG4gICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICB1cmwsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGFsbE9yTm9uZTogb3B0aW9ucy5hbGxPck5vbmUgfHwgZmFsc2UsXG4gICAgICAgIHJlY29yZHM6IF9yZWNvcmRzLFxuICAgICAgfSksXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIC4uLihvcHRpb25zLmhlYWRlcnMgfHwge30pLFxuICAgICAgICAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcHNlcnQgcmVjb3Jkc1xuICAgKi9cbiAgdXBzZXJ0PFxuICAgIE4gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4sXG4gICAgSW5wdXRSZWNvcmQgZXh0ZW5kcyBTT2JqZWN0SW5wdXRSZWNvcmQ8UywgTj4gPSBTT2JqZWN0SW5wdXRSZWNvcmQ8UywgTj4sXG4gICAgRmllbGROYW1lcyBleHRlbmRzIFNPYmplY3RGaWVsZE5hbWVzPFMsIE4+ID0gU09iamVjdEZpZWxkTmFtZXM8UywgTj5cbiAgPihcbiAgICB0eXBlOiBOLFxuICAgIHJlY29yZHM6IElucHV0UmVjb3JkW10sXG4gICAgZXh0SWRGaWVsZDogRmllbGROYW1lcyxcbiAgICBvcHRpb25zPzogRG1sT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxVcHNlcnRSZXN1bHRbXT47XG4gIHVwc2VydDxcbiAgICBOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+LFxuICAgIElucHV0UmVjb3JkIGV4dGVuZHMgU09iamVjdElucHV0UmVjb3JkPFMsIE4+ID0gU09iamVjdElucHV0UmVjb3JkPFMsIE4+LFxuICAgIEZpZWxkTmFtZXMgZXh0ZW5kcyBTT2JqZWN0RmllbGROYW1lczxTLCBOPiA9IFNPYmplY3RGaWVsZE5hbWVzPFMsIE4+XG4gID4oXG4gICAgdHlwZTogTixcbiAgICByZWNvcmQ6IElucHV0UmVjb3JkLFxuICAgIGV4dElkRmllbGQ6IEZpZWxkTmFtZXMsXG4gICAgb3B0aW9ucz86IERtbE9wdGlvbnMsXG4gICk6IFByb21pc2U8VXBzZXJ0UmVzdWx0PjtcbiAgdXBzZXJ0PFxuICAgIE4gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4sXG4gICAgSW5wdXRSZWNvcmQgZXh0ZW5kcyBTT2JqZWN0SW5wdXRSZWNvcmQ8UywgTj4gPSBTT2JqZWN0SW5wdXRSZWNvcmQ8UywgTj4sXG4gICAgRmllbGROYW1lcyBleHRlbmRzIFNPYmplY3RGaWVsZE5hbWVzPFMsIE4+ID0gU09iamVjdEZpZWxkTmFtZXM8UywgTj5cbiAgPihcbiAgICB0eXBlOiBOLFxuICAgIHJlY29yZHM6IElucHV0UmVjb3JkIHwgSW5wdXRSZWNvcmRbXSxcbiAgICBleHRJZEZpZWxkOiBGaWVsZE5hbWVzLFxuICAgIG9wdGlvbnM/OiBEbWxPcHRpb25zLFxuICApOiBQcm9taXNlPFVwc2VydFJlc3VsdCB8IFVwc2VydFJlc3VsdFtdPjtcbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSByZWNvcmRzXG4gICAqIEBwYXJhbSBleHRJZEZpZWxkXG4gICAqIEBwYXJhbSBvcHRpb25zXG4gICAqL1xuICBhc3luYyB1cHNlcnQoXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIHJlY29yZHM6IFJlY29yZCB8IFJlY29yZFtdLFxuICAgIGV4dElkRmllbGQ6IHN0cmluZyxcbiAgICBvcHRpb25zOiBEbWxPcHRpb25zID0ge30sXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdCB8IFNhdmVSZXN1bHRbXT4ge1xuICAgIGNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KHJlY29yZHMpO1xuICAgIGNvbnN0IF9yZWNvcmRzID0gQXJyYXkuaXNBcnJheShyZWNvcmRzKSA/IHJlY29yZHMgOiBbcmVjb3Jkc107XG4gICAgaWYgKF9yZWNvcmRzLmxlbmd0aCA+IHRoaXMuX21heFJlcXVlc3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRXhjZWVkZWQgbWF4IGxpbWl0IG9mIGNvbmN1cnJlbnQgY2FsbCcpO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBfcmVjb3Jkcy5tYXAoKHJlY29yZCkgPT4ge1xuICAgICAgICBjb25zdCB7IFtleHRJZEZpZWxkXTogZXh0SWQsIHR5cGU6IHJ0eXBlLCBhdHRyaWJ1dGVzLCAuLi5yZWMgfSA9IHJlY29yZDtcbiAgICAgICAgY29uc3QgdXJsID0gW3RoaXMuX2Jhc2VVcmwoKSwgJ3NvYmplY3RzJywgdHlwZSwgZXh0SWRGaWVsZCwgZXh0SWRdLmpvaW4oXG4gICAgICAgICAgJy8nLFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0PFNhdmVSZXN1bHQ+KFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlYyksXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgIC4uLihvcHRpb25zLmhlYWRlcnMgfHwge30pLFxuICAgICAgICAgICAgICAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5vQ29udGVudFJlc3BvbnNlOiB7IHN1Y2Nlc3M6IHRydWUsIGVycm9yczogW10gfSxcbiAgICAgICAgICB9LFxuICAgICAgICApLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAvLyBCZSBhd2FyZSB0aGF0IGBhbGxPck5vbmVgIG9wdGlvbiBpbiB1cHNlcnQgbWV0aG9kXG4gICAgICAgICAgLy8gd2lsbCBub3QgcmV2ZXJ0IHRoZSBvdGhlciBzdWNjZXNzZnVsIHJlcXVlc3RzLlxuICAgICAgICAgIC8vIEl0IG9ubHkgcmFpc2VzIGVycm9yIHdoZW4gbWV0IGF0IGxlYXN0IG9uZSBmYWlsZWQgcmVxdWVzdC5cbiAgICAgICAgICBpZiAoIWlzQXJyYXkgfHwgb3B0aW9ucy5hbGxPck5vbmUgfHwgIWVyci5lcnJvckNvZGUpIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRvU2F2ZVJlc3VsdChlcnIpO1xuICAgICAgICB9KTtcbiAgICAgIH0pLFxuICAgICk7XG4gICAgcmV0dXJuIGlzQXJyYXkgPyByZXN1bHRzIDogcmVzdWx0c1swXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGUgcmVjb3Jkc1xuICAgKi9cbiAgZGVzdHJveTxOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+PihcbiAgICB0eXBlOiBOLFxuICAgIGlkczogc3RyaW5nW10sXG4gICAgb3B0aW9ucz86IERtbE9wdGlvbnMsXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdFtdPjtcbiAgZGVzdHJveTxOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+PihcbiAgICB0eXBlOiBOLFxuICAgIGlkOiBzdHJpbmcsXG4gICAgb3B0aW9ucz86IERtbE9wdGlvbnMsXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdD47XG4gIGRlc3Ryb3k8TiBleHRlbmRzIFNPYmplY3ROYW1lczxTPj4oXG4gICAgdHlwZTogTixcbiAgICBpZHM6IHN0cmluZyB8IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM/OiBEbWxPcHRpb25zLFxuICApOiBQcm9taXNlPFNhdmVSZXN1bHQgfCBTYXZlUmVzdWx0W10+O1xuICAvKipcbiAgICogQHBhcmFtIHR5cGVcbiAgICogQHBhcmFtIGlkc1xuICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgKi9cbiAgYXN5bmMgZGVzdHJveShcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgaWRzOiBzdHJpbmcgfCBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiBEbWxPcHRpb25zID0ge30sXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdCB8IFNhdmVSZXN1bHRbXT4ge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KGlkcylcbiAgICAgID8gLy8gY2hlY2sgdGhlIHZlcnNpb24gd2hldGhlciBTT2JqZWN0IGNvbGxlY3Rpb24gQVBJIGlzIHN1cHBvcnRlZCAoNDIuMClcbiAgICAgICAgdGhpcy5fZW5zdXJlVmVyc2lvbig0MilcbiAgICAgICAgPyB0aGlzLl9kZXN0cm95TWFueSh0eXBlLCBpZHMsIG9wdGlvbnMpXG4gICAgICAgIDogdGhpcy5fZGVzdHJveVBhcmFsbGVsKHR5cGUsIGlkcywgb3B0aW9ucylcbiAgICAgIDogdGhpcy5fZGVzdHJveVNpbmdsZSh0eXBlLCBpZHMsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIGFzeW5jIF9kZXN0cm95U2luZ2xlKFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBpZDogc3RyaW5nLFxuICAgIG9wdGlvbnM6IERtbE9wdGlvbnMsXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdD4ge1xuICAgIGNvbnN0IHVybCA9IFt0aGlzLl9iYXNlVXJsKCksICdzb2JqZWN0cycsIHR5cGUsIGlkXS5qb2luKCcvJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgdXJsLFxuICAgICAgICBoZWFkZXJzOiBvcHRpb25zLmhlYWRlcnMgfHwge30sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBub0NvbnRlbnRSZXNwb25zZTogeyBpZCwgc3VjY2VzczogdHJ1ZSwgZXJyb3JzOiBbXSB9LFxuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIGFzeW5jIF9kZXN0cm95UGFyYWxsZWwodHlwZTogc3RyaW5nLCBpZHM6IHN0cmluZ1tdLCBvcHRpb25zOiBEbWxPcHRpb25zKSB7XG4gICAgaWYgKGlkcy5sZW5ndGggPiB0aGlzLl9tYXhSZXF1ZXN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4Y2VlZGVkIG1heCBsaW1pdCBvZiBjb25jdXJyZW50IGNhbGwnKTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgaWRzLm1hcCgoaWQpID0+XG4gICAgICAgIHRoaXMuX2Rlc3Ryb3lTaW5nbGUodHlwZSwgaWQsIG9wdGlvbnMpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAvLyBCZSBhd2FyZSB0aGF0IGBhbGxPck5vbmVgIG9wdGlvbiBpbiBwYXJhbGxlbCBtb2RlXG4gICAgICAgICAgLy8gd2lsbCBub3QgcmV2ZXJ0IHRoZSBvdGhlciBzdWNjZXNzZnVsIHJlcXVlc3RzLlxuICAgICAgICAgIC8vIEl0IG9ubHkgcmFpc2VzIGVycm9yIHdoZW4gbWV0IGF0IGxlYXN0IG9uZSBmYWlsZWQgcmVxdWVzdC5cbiAgICAgICAgICBpZiAob3B0aW9ucy5hbGxPck5vbmUgfHwgIWVyci5lcnJvckNvZGUpIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRvU2F2ZVJlc3VsdChlcnIpO1xuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBhc3luYyBfZGVzdHJveU1hbnkoXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIGlkczogc3RyaW5nW10sXG4gICAgb3B0aW9uczogRG1sT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxTYXZlUmVzdWx0W10+IHtcbiAgICBpZiAoaWRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAoaWRzLmxlbmd0aCA+IE1BWF9ETUxfQ09VTlQgJiYgb3B0aW9ucy5hbGxvd1JlY3Vyc2l2ZSkge1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgLi4uKGF3YWl0IHRoaXMuX2Rlc3Ryb3lNYW55KFxuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgaWRzLnNsaWNlKDAsIE1BWF9ETUxfQ09VTlQpLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICkpLFxuICAgICAgICAuLi4oYXdhaXQgdGhpcy5fZGVzdHJveU1hbnkodHlwZSwgaWRzLnNsaWNlKE1BWF9ETUxfQ09VTlQpLCBvcHRpb25zKSksXG4gICAgICBdO1xuICAgIH1cbiAgICBsZXQgdXJsID1cbiAgICAgIFt0aGlzLl9iYXNlVXJsKCksICdjb21wb3NpdGUnLCAnc29iamVjdHM/aWRzPSddLmpvaW4oJy8nKSArIGlkcy5qb2luKCcsJyk7XG4gICAgaWYgKG9wdGlvbnMuYWxsT3JOb25lKSB7XG4gICAgICB1cmwgKz0gJyZhbGxPck5vbmU9dHJ1ZSc7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3Qoe1xuICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgIHVybCxcbiAgICAgIGhlYWRlcnM6IG9wdGlvbnMuaGVhZGVycyB8fCB7fSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTeW5vbnltIG9mIENvbm5lY3Rpb24jZGVzdHJveSgpXG4gICAqL1xuICBkZWxldGUgPSB0aGlzLmRlc3Ryb3k7XG5cbiAgLyoqXG4gICAqIFN5bm9ueW0gb2YgQ29ubmVjdGlvbiNkZXN0cm95KClcbiAgICovXG4gIGRlbCA9IHRoaXMuZGVzdHJveTtcblxuICAvKipcbiAgICogRGVzY3JpYmUgU09iamVjdCBtZXRhZGF0YVxuICAgKi9cbiAgYXN5bmMgZGVzY3JpYmUodHlwZTogc3RyaW5nKTogUHJvbWlzZTxEZXNjcmliZVNPYmplY3RSZXN1bHQ+IHtcbiAgICBjb25zdCB1cmwgPSBbdGhpcy5fYmFzZVVybCgpLCAnc29iamVjdHMnLCB0eXBlLCAnZGVzY3JpYmUnXS5qb2luKCcvJyk7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHRoaXMucmVxdWVzdCh1cmwpO1xuICAgIHJldHVybiBib2R5IGFzIERlc2NyaWJlU09iamVjdFJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXNjcmliZSBnbG9iYWwgU09iamVjdHNcbiAgICovXG4gIGFzeW5jIGRlc2NyaWJlR2xvYmFsKCkge1xuICAgIGNvbnN0IHVybCA9IGAke3RoaXMuX2Jhc2VVcmwoKX0vc29iamVjdHNgO1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCB0aGlzLnJlcXVlc3QodXJsKTtcbiAgICByZXR1cm4gYm9keSBhcyBEZXNjcmliZUdsb2JhbFJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgU09iamVjdCBpbnN0YW5jZVxuICAgKi9cbiAgc29iamVjdDxOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+Pih0eXBlOiBOKTogU09iamVjdDxTLCBOPjtcbiAgc29iamVjdDxOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+Pih0eXBlOiBzdHJpbmcpOiBTT2JqZWN0PFMsIE4+O1xuICBzb2JqZWN0PE4gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4+KHR5cGU6IE4gfCBzdHJpbmcpOiBTT2JqZWN0PFMsIE4+IHtcbiAgICBjb25zdCBzbyA9XG4gICAgICAodGhpcy5zb2JqZWN0c1t0eXBlIGFzIE5dIGFzIFNPYmplY3Q8UywgTj4gfCB1bmRlZmluZWQpIHx8XG4gICAgICBuZXcgU09iamVjdCh0aGlzLCB0eXBlIGFzIE4pO1xuICAgIHRoaXMuc29iamVjdHNbdHlwZSBhcyBOXSA9IHNvO1xuICAgIHJldHVybiBzbztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgaWRlbnRpdHkgaW5mb3JtYXRpb24gb2YgY3VycmVudCB1c2VyXG4gICAqL1xuICBhc3luYyBpZGVudGl0eShvcHRpb25zOiB7IGhlYWRlcnM/OiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSB9ID0ge30pIHtcbiAgICBsZXQgdXJsID0gdGhpcy51c2VySW5mbyAmJiB0aGlzLnVzZXJJbmZvLnVybDtcbiAgICBpZiAoIXVybCkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5yZXF1ZXN0PHsgaWRlbnRpdHk6IHN0cmluZyB9Pih7XG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIHVybDogdGhpcy5fYmFzZVVybCgpLFxuICAgICAgICBoZWFkZXJzOiBvcHRpb25zLmhlYWRlcnMsXG4gICAgICB9KTtcbiAgICAgIHVybCA9IHJlcy5pZGVudGl0eTtcbiAgICB9XG4gICAgdXJsICs9ICc/Zm9ybWF0PWpzb24nO1xuICAgIGlmICh0aGlzLmFjY2Vzc1Rva2VuKSB7XG4gICAgICB1cmwgKz0gYCZvYXV0aF90b2tlbj0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmFjY2Vzc1Rva2VuKX1gO1xuICAgIH1cbiAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLnJlcXVlc3Q8SWRlbnRpdHlJbmZvPih7IG1ldGhvZDogJ0dFVCcsIHVybCB9KTtcbiAgICB0aGlzLnVzZXJJbmZvID0ge1xuICAgICAgaWQ6IHJlcy51c2VyX2lkLFxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHJlcy5vcmdhbml6YXRpb25faWQsXG4gICAgICB1cmw6IHJlcy5pZCxcbiAgICB9O1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvKipcbiAgICogTGlzdCByZWNlbnRseSB2aWV3ZWQgcmVjb3Jkc1xuICAgKi9cbiAgYXN5bmMgcmVjZW50KHR5cGU/OiBzdHJpbmcgfCBudW1iZXIsIGxpbWl0PzogbnVtYmVyKSB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tcGFyYW0tcmVhc3NpZ24gKi9cbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBsaW1pdCA9IHR5cGU7XG4gICAgICB0eXBlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZXQgdXJsO1xuICAgIGlmICh0eXBlKSB7XG4gICAgICB1cmwgPSBbdGhpcy5fYmFzZVVybCgpLCAnc29iamVjdHMnLCB0eXBlXS5qb2luKCcvJyk7XG4gICAgICBjb25zdCB7IHJlY2VudEl0ZW1zIH0gPSBhd2FpdCB0aGlzLnJlcXVlc3Q8eyByZWNlbnRJdGVtczogUmVjb3JkW10gfT4oXG4gICAgICAgIHVybCxcbiAgICAgICk7XG4gICAgICByZXR1cm4gbGltaXQgPyByZWNlbnRJdGVtcy5zbGljZSgwLCBsaW1pdCkgOiByZWNlbnRJdGVtcztcbiAgICB9XG4gICAgdXJsID0gYCR7dGhpcy5fYmFzZVVybCgpfS9yZWNlbnRgO1xuICAgIGlmIChsaW1pdCkge1xuICAgICAgdXJsICs9IGA/bGltaXQ9JHtsaW1pdH1gO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0PFJlY29yZFtdPih1cmwpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHVwZGF0ZWQgcmVjb3Jkc1xuICAgKi9cbiAgYXN5bmMgdXBkYXRlZChcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgc3RhcnQ6IHN0cmluZyB8IERhdGUsXG4gICAgZW5kOiBzdHJpbmcgfCBEYXRlLFxuICApOiBQcm9taXNlPFVwZGF0ZWRSZXN1bHQ+IHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1wYXJhbS1yZWFzc2lnbiAqL1xuICAgIGxldCB1cmwgPSBbdGhpcy5fYmFzZVVybCgpLCAnc29iamVjdHMnLCB0eXBlLCAndXBkYXRlZCddLmpvaW4oJy8nKTtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgc3RhcnQgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgfVxuICAgIHN0YXJ0ID0gZm9ybWF0RGF0ZShzdGFydCk7XG4gICAgdXJsICs9IGA/c3RhcnQ9JHtlbmNvZGVVUklDb21wb25lbnQoc3RhcnQpfWA7XG4gICAgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmQgPSBuZXcgRGF0ZShlbmQpO1xuICAgIH1cbiAgICBlbmQgPSBmb3JtYXREYXRlKGVuZCk7XG4gICAgdXJsICs9IGAmZW5kPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGVuZCl9YDtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgdGhpcy5yZXF1ZXN0KHVybCk7XG4gICAgcmV0dXJuIGJvZHkgYXMgVXBkYXRlZFJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBkZWxldGVkIHJlY29yZHNcbiAgICovXG4gIGFzeW5jIGRlbGV0ZWQoXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIHN0YXJ0OiBzdHJpbmcgfCBEYXRlLFxuICAgIGVuZDogc3RyaW5nIHwgRGF0ZSxcbiAgKTogUHJvbWlzZTxEZWxldGVkUmVzdWx0PiB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tcGFyYW0tcmVhc3NpZ24gKi9cbiAgICBsZXQgdXJsID0gW3RoaXMuX2Jhc2VVcmwoKSwgJ3NvYmplY3RzJywgdHlwZSwgJ2RlbGV0ZWQnXS5qb2luKCcvJyk7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHN0YXJ0ID0gbmV3IERhdGUoc3RhcnQpO1xuICAgIH1cbiAgICBzdGFydCA9IGZvcm1hdERhdGUoc3RhcnQpO1xuICAgIHVybCArPSBgP3N0YXJ0PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0YXJ0KX1gO1xuXG4gICAgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmQgPSBuZXcgRGF0ZShlbmQpO1xuICAgIH1cbiAgICBlbmQgPSBmb3JtYXREYXRlKGVuZCk7XG4gICAgdXJsICs9IGAmZW5kPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGVuZCl9YDtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgdGhpcy5yZXF1ZXN0KHVybCk7XG4gICAgcmV0dXJuIGJvZHkgYXMgRGVsZXRlZFJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbGlzdCBvZiBhbGwgdGFic1xuICAgKi9cbiAgYXN5bmMgdGFicygpOiBQcm9taXNlPERlc2NyaWJlVGFiW10+IHtcbiAgICBjb25zdCB1cmwgPSBbdGhpcy5fYmFzZVVybCgpLCAndGFicyddLmpvaW4oJy8nKTtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgdGhpcy5yZXF1ZXN0KHVybCk7XG4gICAgcmV0dXJuIGJvZHkgYXMgRGVzY3JpYmVUYWJbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGN1cnJlbiBzeXN0ZW0gbGltaXQgaW4gdGhlIG9yZ2FuaXphdGlvblxuICAgKi9cbiAgYXN5bmMgbGltaXRzKCk6IFByb21pc2U8T3JnYW5pemF0aW9uTGltaXRzSW5mbz4ge1xuICAgIGNvbnN0IHVybCA9IFt0aGlzLl9iYXNlVXJsKCksICdsaW1pdHMnXS5qb2luKCcvJyk7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHRoaXMucmVxdWVzdCh1cmwpO1xuICAgIHJldHVybiBib2R5IGFzIE9yZ2FuaXphdGlvbkxpbWl0c0luZm87XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIHRoZW1lIGluZm9cbiAgICovXG4gIGFzeW5jIHRoZW1lKCk6IFByb21pc2U8RGVzY3JpYmVUaGVtZT4ge1xuICAgIGNvbnN0IHVybCA9IFt0aGlzLl9iYXNlVXJsKCksICd0aGVtZSddLmpvaW4oJy8nKTtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgdGhpcy5yZXF1ZXN0KHVybCk7XG4gICAgcmV0dXJuIGJvZHkgYXMgRGVzY3JpYmVUaGVtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCByZWdpc3RlcmVkIGdsb2JhbCBxdWljayBhY3Rpb25zXG4gICAqL1xuICBhc3luYyBxdWlja0FjdGlvbnMoKTogUHJvbWlzZTxEZXNjcmliZVF1aWNrQWN0aW9uUmVzdWx0W10+IHtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgdGhpcy5yZXF1ZXN0KCcvcXVpY2tBY3Rpb25zJyk7XG4gICAgcmV0dXJuIGJvZHkgYXMgRGVzY3JpYmVRdWlja0FjdGlvblJlc3VsdFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCByZWZlcmVuY2UgZm9yIHNwZWNpZmllZCBnbG9iYWwgcXVpY2sgYWNpdG9uXG4gICAqL1xuICBxdWlja0FjdGlvbihhY3Rpb25OYW1lOiBzdHJpbmcpOiBRdWlja0FjdGlvbjxTPiB7XG4gICAgcmV0dXJuIG5ldyBRdWlja0FjdGlvbih0aGlzLCBgL3F1aWNrQWN0aW9ucy8ke2FjdGlvbk5hbWV9YCk7XG4gIH1cblxuICAvKipcbiAgICogTW9kdWxlIHdoaWNoIG1hbmFnZXMgcHJvY2VzcyBydWxlcyBhbmQgYXBwcm92YWwgcHJvY2Vzc2VzXG4gICAqL1xuICBwcm9jZXNzID0gbmV3IFByb2Nlc3ModGhpcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbm5lY3Rpb247XG4iXX0=