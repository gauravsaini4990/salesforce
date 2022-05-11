"use strict";

var _context4;

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");

var _Object$defineProperty = require("@babel/runtime-corejs3/core-js-stable/object/define-property");

var _Object$defineProperties = require("@babel/runtime-corejs3/core-js-stable/object/define-properties");

var _Object$getOwnPropertyDescriptors = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-descriptors");

var _forEachInstanceProperty = require("@babel/runtime-corejs3/core-js-stable/instance/for-each");

var _Object$getOwnPropertyDescriptor = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-descriptor");

var _filterInstanceProperty = require("@babel/runtime-corejs3/core-js-stable/instance/filter");

var _Object$getOwnPropertySymbols = require("@babel/runtime-corejs3/core-js-stable/object/get-own-property-symbols");

var _Object$keys = require("@babel/runtime-corejs3/core-js-stable/object/keys");

require("core-js/modules/es.promise");

_Object$defineProperty(exports, "__esModule", {
  value: true
});

var _exportNames = {
  MetadataApi: true,
  AsyncResultLocator: true,
  RetrieveResultLocator: true,
  DeployResultLocator: true
};
exports.default = exports.DeployResultLocator = exports.RetrieveResultLocator = exports.AsyncResultLocator = exports.MetadataApi = void 0;

var _setTimeout2 = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/set-timeout"));

var _concat = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/concat"));

var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));

var _map = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/map"));

var _isArray = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/array/is-array"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/defineProperty"));

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/objectWithoutProperties"));

var _events = require("events");

var _stream = require("stream");

var _jsforce = require("../jsforce");

var _soap = _interopRequireDefault(require("../soap"));

var _function = require("../util/function");

var _schema = require("./metadata/schema");

_forEachInstanceProperty(_context4 = _Object$keys(_schema)).call(_context4, function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _schema[key]) return;

  _Object$defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _schema[key];
    }
  });
});

function ownKeys(object, enumerableOnly) { var keys = _Object$keys(object); if (_Object$getOwnPropertySymbols) { var symbols = _Object$getOwnPropertySymbols(object); if (enumerableOnly) symbols = _filterInstanceProperty(symbols).call(symbols, function (sym) { return _Object$getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { var _context2; _forEachInstanceProperty(_context2 = ownKeys(Object(source), true)).call(_context2, function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (_Object$getOwnPropertyDescriptors) { _Object$defineProperties(target, _Object$getOwnPropertyDescriptors(source)); } else { var _context3; _forEachInstanceProperty(_context3 = ownKeys(Object(source))).call(_context3, function (key) { _Object$defineProperty(target, key, _Object$getOwnPropertyDescriptor(source, key)); }); } } return target; }

/**
 *
 */
function deallocateTypeWithMetadata(metadata) {
  const _ref = metadata,
        {
    $
  } = _ref,
        md = (0, _objectWithoutProperties2.default)(_ref, ["$"]);
  return md;
}

function assignTypeWithMetadata(metadata, type) {
  const convert = md => _objectSpread({
    ['@xsi:type']: type
  }, md);

  return (0, _isArray.default)(metadata) ? (0, _map.default)(metadata).call(metadata, convert) : convert(metadata);
}
/**
 * Class for Salesforce Metadata API
 */


class MetadataApi {
  /**
   * Polling interval in milliseconds
   */

  /**
   * Polling timeout in milliseconds
   */

  /**
   *
   */
  constructor(conn) {
    (0, _defineProperty2.default)(this, "_conn", void 0);
    (0, _defineProperty2.default)(this, "pollInterval", 1000);
    (0, _defineProperty2.default)(this, "pollTimeout", 10000);
    this._conn = conn;
  }
  /**
   * Call Metadata API SOAP endpoint
   *
   * @private
   */


  async _invoke(method, message, schema) {
    const soapEndpoint = new _soap.default(this._conn, {
      xmlns: 'http://soap.sforce.com/2006/04/metadata',
      endpointUrl: `${this._conn.instanceUrl}/services/Soap/m/${this._conn.version}`
    });
    const res = await soapEndpoint.invoke(method, message, schema ? {
      result: schema
    } : undefined, _schema.ApiSchemas);
    return res.result;
  }
  /**
   * Add one or more new metadata components to the organization.
   */


  create(type, metadata) {
    const isArray = (0, _isArray.default)(metadata);
    metadata = assignTypeWithMetadata(metadata, type);
    const schema = isArray ? [_schema.ApiSchemas.SaveResult] : _schema.ApiSchemas.SaveResult;
    return this._invoke('createMetadata', {
      metadata
    }, schema);
  }
  /**
   * Read specified metadata components in the organization.
   */


  async read(type, fullNames) {
    var _context;

    const ReadResultSchema = type in _schema.ApiSchemas ? {
      type: _schema.ApiSchemas.ReadResult.type,
      props: {
        records: [type]
      }
    } : _schema.ApiSchemas.ReadResult;
    const res = await this._invoke('readMetadata', {
      type,
      fullNames
    }, ReadResultSchema);
    return (0, _isArray.default)(fullNames) ? (0, _map.default)(_context = res.records).call(_context, deallocateTypeWithMetadata) : deallocateTypeWithMetadata(res.records[0]);
  }
  /**
   * Update one or more metadata components in the organization.
   */


  update(type, metadata) {
    const isArray = (0, _isArray.default)(metadata);
    metadata = assignTypeWithMetadata(metadata, type);
    const schema = isArray ? [_schema.ApiSchemas.SaveResult] : _schema.ApiSchemas.SaveResult;
    return this._invoke('updateMetadata', {
      metadata
    }, schema);
  }
  /**
   * Upsert one or more components in your organization's data.
   */


  upsert(type, metadata) {
    const isArray = (0, _isArray.default)(metadata);
    metadata = assignTypeWithMetadata(metadata, type);
    const schema = isArray ? [_schema.ApiSchemas.UpsertResult] : _schema.ApiSchemas.UpsertResult;
    return this._invoke('upsertMetadata', {
      metadata
    }, schema);
  }
  /**
   * Deletes specified metadata components in the organization.
   */


  delete(type, fullNames) {
    const schema = (0, _isArray.default)(fullNames) ? [_schema.ApiSchemas.SaveResult] : _schema.ApiSchemas.SaveResult;
    return this._invoke('deleteMetadata', {
      type,
      fullNames
    }, schema);
  }
  /**
   * Rename fullname of a metadata component in the organization
   */


  rename(type, oldFullName, newFullName) {
    return this._invoke('renameMetadata', {
      type,
      oldFullName,
      newFullName
    }, _schema.ApiSchemas.SaveResult);
  }
  /**
   * Retrieves the metadata which describes your organization, including Apex classes and triggers,
   * custom objects, custom fields on standard objects, tab sets that define an app,
   * and many other components.
   */


  describe(asOfVersion) {
    if (!asOfVersion) {
      asOfVersion = this._conn.version;
    }

    return this._invoke('describeMetadata', {
      asOfVersion
    }, _schema.ApiSchemas.DescribeMetadataResult);
  }
  /**
   * Retrieves property information about metadata components in your organization
   */


  list(queries, asOfVersion) {
    if (!asOfVersion) {
      asOfVersion = this._conn.version;
    }

    return this._invoke('listMetadata', {
      queries,
      asOfVersion
    }, [_schema.ApiSchemas.FileProperties]);
  }
  /**
   * Checks the status of asynchronous metadata calls
   */


  checkStatus(asyncProcessId) {
    const res = this._invoke('checkStatus', {
      asyncProcessId
    }, _schema.ApiSchemas.AsyncResult);

    return new AsyncResultLocator(this, res);
  }
  /**
   * Retrieves XML file representations of components in an organization
   */


  retrieve(request) {
    const res = this._invoke('retrieve', {
      request
    }, _schema.ApiSchemas.RetrieveResult);

    return new RetrieveResultLocator(this, res);
  }
  /**
   * Checks the status of declarative metadata call retrieve() and returns the zip file contents
   */


  checkRetrieveStatus(asyncProcessId) {
    return this._invoke('checkRetrieveStatus', {
      asyncProcessId
    }, _schema.ApiSchemas.RetrieveResult);
  }
  /**
   * Deploy components into an organization using zipped file representations
   */


  deploy(zipInput, options = {}) {
    const res = (async () => {
      const zipContentB64 = await new _promise.default((resolve, reject) => {
        if ((0, _function.isObject)(zipInput) && 'pipe' in zipInput && typeof zipInput.pipe === 'function') {
          const bufs = [];
          zipInput.on('data', d => bufs.push(d));
          zipInput.on('error', reject);
          zipInput.on('end', () => {
            resolve((0, _concat.default)(Buffer).call(Buffer, bufs).toString('base64'));
          }); // zipInput.resume();
        } else if (zipInput instanceof Buffer) {
          resolve(zipInput.toString('base64'));
        } else if (zipInput instanceof String || typeof zipInput === 'string') {
          resolve(zipInput);
        } else {
          throw 'Unexpected zipInput type';
        }
      });
      return this._invoke('deploy', {
        ZipFile: zipContentB64,
        DeployOptions: options
      }, _schema.ApiSchemas.DeployResult);
    })();

    return new DeployResultLocator(this, res);
  }
  /**
   * Checks the status of declarative metadata call deploy()
   */


  checkDeployStatus(asyncProcessId, includeDetails = false) {
    return this._invoke('checkDeployStatus', {
      asyncProcessId,
      includeDetails
    }, _schema.ApiSchemas.DeployResult);
  }

}
/*--------------------------------------------*/

/**
 * The locator class for Metadata API asynchronous call result
 */


exports.MetadataApi = MetadataApi;

class AsyncResultLocator extends _events.EventEmitter {
  /**
   *
   */
  constructor(meta, promise) {
    super();
    (0, _defineProperty2.default)(this, "_meta", void 0);
    (0, _defineProperty2.default)(this, "_promise", void 0);
    (0, _defineProperty2.default)(this, "_id", void 0);
    this._meta = meta;
    this._promise = promise;
  }
  /**
   * Promise/A+ interface
   * http://promises-aplus.github.io/promises-spec/
   *
   * @method Metadata~AsyncResultLocator#then
   */


  then(onResolve, onReject) {
    return this._promise.then(onResolve, onReject);
  }
  /**
   * Check the status of async request
   */


  async check() {
    const result = await this._promise;
    this._id = result.id;
    return await this._meta.checkStatus(result.id);
  }
  /**
   * Polling until async call status becomes complete or error
   */


  poll(interval, timeout) {
    const startTime = new Date().getTime();

    const poll = async () => {
      try {
        const now = new Date().getTime();

        if (startTime + timeout < now) {
          let errMsg = 'Polling time out.';

          if (this._id) {
            errMsg += ' Process Id = ' + this._id;
          }

          this.emit('error', new Error(errMsg));
          return;
        }

        const result = await this.check();

        if (result.done) {
          this.emit('complete', result);
        } else {
          this.emit('progress', result);
          (0, _setTimeout2.default)(poll, interval);
        }
      } catch (err) {
        this.emit('error', err);
      }
    };

    (0, _setTimeout2.default)(poll, interval);
  }
  /**
   * Check and wait until the async requests become in completed status
   */


  complete() {
    return new _promise.default((resolve, reject) => {
      this.on('complete', resolve);
      this.on('error', reject);
      this.poll(this._meta.pollInterval, this._meta.pollTimeout);
    });
  }

}
/*--------------------------------------------*/

/**
 * The locator class to track retreive() Metadata API call result
 */


exports.AsyncResultLocator = AsyncResultLocator;

class RetrieveResultLocator extends AsyncResultLocator {
  /**
   * Check and wait until the async request becomes in completed status,
   * and retrieve the result data.
   */
  async complete() {
    const result = await super.complete();
    return this._meta.checkRetrieveStatus(result.id);
  }
  /**
   * Change the retrieved result to Node.js readable stream
   */


  stream() {
    const resultStream = new _stream.Readable();
    let reading = false;

    resultStream._read = async () => {
      if (reading) {
        return;
      }

      reading = true;

      try {
        const result = await this.complete();
        resultStream.push(Buffer.from(result.zipFile, 'base64'));
        resultStream.push(null);
      } catch (e) {
        resultStream.emit('error', e);
      }
    };

    return resultStream;
  }

}
/*--------------------------------------------*/

/**
 * The locator class to track deploy() Metadata API call result
 *
 * @protected
 * @class Metadata~DeployResultLocator
 * @extends Metadata~AsyncResultLocator
 * @param {Metadata} meta - Metadata API object
 * @param {Promise.<Metadata~AsyncResult>} result - Promise object for async result of deploy() call
 */


exports.RetrieveResultLocator = RetrieveResultLocator;

class DeployResultLocator extends AsyncResultLocator {
  /**
   * Check and wait until the async request becomes in completed status,
   * and retrieve the result data.
   */
  async complete(includeDetails) {
    const result = await super.complete();
    return this._meta.checkDeployStatus(result.id, includeDetails);
  }

}
/*--------------------------------------------*/

/*
 * Register hook in connection instantiation for dynamically adding this API module features
 */


exports.DeployResultLocator = DeployResultLocator;
(0, _jsforce.registerModule)('metadata', conn => new MetadataApi(conn));
var _default = MetadataApi;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hcGkvbWV0YWRhdGEudHMiXSwibmFtZXMiOlsiZGVhbGxvY2F0ZVR5cGVXaXRoTWV0YWRhdGEiLCJtZXRhZGF0YSIsIiQiLCJtZCIsImFzc2lnblR5cGVXaXRoTWV0YWRhdGEiLCJ0eXBlIiwiY29udmVydCIsIk1ldGFkYXRhQXBpIiwiY29uc3RydWN0b3IiLCJjb25uIiwiX2Nvbm4iLCJfaW52b2tlIiwibWV0aG9kIiwibWVzc2FnZSIsInNjaGVtYSIsInNvYXBFbmRwb2ludCIsIlNPQVAiLCJ4bWxucyIsImVuZHBvaW50VXJsIiwiaW5zdGFuY2VVcmwiLCJ2ZXJzaW9uIiwicmVzIiwiaW52b2tlIiwicmVzdWx0IiwidW5kZWZpbmVkIiwiQXBpU2NoZW1hcyIsImNyZWF0ZSIsImlzQXJyYXkiLCJTYXZlUmVzdWx0IiwicmVhZCIsImZ1bGxOYW1lcyIsIlJlYWRSZXN1bHRTY2hlbWEiLCJSZWFkUmVzdWx0IiwicHJvcHMiLCJyZWNvcmRzIiwidXBkYXRlIiwidXBzZXJ0IiwiVXBzZXJ0UmVzdWx0IiwiZGVsZXRlIiwicmVuYW1lIiwib2xkRnVsbE5hbWUiLCJuZXdGdWxsTmFtZSIsImRlc2NyaWJlIiwiYXNPZlZlcnNpb24iLCJEZXNjcmliZU1ldGFkYXRhUmVzdWx0IiwibGlzdCIsInF1ZXJpZXMiLCJGaWxlUHJvcGVydGllcyIsImNoZWNrU3RhdHVzIiwiYXN5bmNQcm9jZXNzSWQiLCJBc3luY1Jlc3VsdCIsIkFzeW5jUmVzdWx0TG9jYXRvciIsInJldHJpZXZlIiwicmVxdWVzdCIsIlJldHJpZXZlUmVzdWx0IiwiUmV0cmlldmVSZXN1bHRMb2NhdG9yIiwiY2hlY2tSZXRyaWV2ZVN0YXR1cyIsImRlcGxveSIsInppcElucHV0Iiwib3B0aW9ucyIsInppcENvbnRlbnRCNjQiLCJyZXNvbHZlIiwicmVqZWN0IiwicGlwZSIsImJ1ZnMiLCJvbiIsImQiLCJwdXNoIiwiQnVmZmVyIiwidG9TdHJpbmciLCJTdHJpbmciLCJaaXBGaWxlIiwiRGVwbG95T3B0aW9ucyIsIkRlcGxveVJlc3VsdCIsIkRlcGxveVJlc3VsdExvY2F0b3IiLCJjaGVja0RlcGxveVN0YXR1cyIsImluY2x1ZGVEZXRhaWxzIiwiRXZlbnRFbWl0dGVyIiwibWV0YSIsInByb21pc2UiLCJfbWV0YSIsIl9wcm9taXNlIiwidGhlbiIsIm9uUmVzb2x2ZSIsIm9uUmVqZWN0IiwiY2hlY2siLCJfaWQiLCJpZCIsInBvbGwiLCJpbnRlcnZhbCIsInRpbWVvdXQiLCJzdGFydFRpbWUiLCJEYXRlIiwiZ2V0VGltZSIsIm5vdyIsImVyck1zZyIsImVtaXQiLCJFcnJvciIsImRvbmUiLCJlcnIiLCJjb21wbGV0ZSIsInBvbGxJbnRlcnZhbCIsInBvbGxUaW1lb3V0Iiwic3RyZWFtIiwicmVzdWx0U3RyZWFtIiwiUmVhZGFibGUiLCJyZWFkaW5nIiwiX3JlYWQiLCJmcm9tIiwiemlwRmlsZSIsImUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBSUE7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBRUE7O0FBZ0JBO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7Ozs7QUFxQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBU0EsMEJBQVQsQ0FBd0RDLFFBQXhELEVBQXdFO0FBQ3RFLGVBQXFCQSxRQUFyQjtBQUFBLFFBQU07QUFBRUMsSUFBQUE7QUFBRixHQUFOO0FBQUEsUUFBY0MsRUFBZDtBQUNBLFNBQU9BLEVBQVA7QUFDRDs7QUFFRCxTQUFTQyxzQkFBVCxDQUFnQ0gsUUFBaEMsRUFBaUVJLElBQWpFLEVBQStFO0FBQzdFLFFBQU1DLE9BQU8sR0FBSUgsRUFBRDtBQUFxQixLQUFDLFdBQUQsR0FBZUU7QUFBcEMsS0FBNkNGLEVBQTdDLENBQWhCOztBQUNBLFNBQU8sc0JBQWNGLFFBQWQsSUFBMEIsa0JBQUFBLFFBQVEsTUFBUixDQUFBQSxRQUFRLEVBQUtLLE9BQUwsQ0FB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RUFBMkJjLENBQTNCO0FBQ0Q7QUFDRixLQVpEOztBQWFBLFdBQU9OLFlBQVA7QUFDRDs7QUE5QkQ7QUFpQ0Y7O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQUNPLE1BQU05QixtQkFBTixTQUFvRHZCLGtCQUFwRCxDQUdMO0FBQ0E7QUFDRjtBQUNBO0FBQ0E7QUFDRSxRQUFNaUQsUUFBTixDQUFleEIsY0FBZixFQUF5QztBQUN2QyxVQUFNckQsTUFBTSxHQUFHLE1BQU0sTUFBTTZFLFFBQU4sRUFBckI7QUFDQSxXQUFPLEtBQUtwQixLQUFMLENBQVdMLGlCQUFYLENBQTZCcEQsTUFBTSxDQUFDZ0UsRUFBcEMsRUFBd0NYLGNBQXhDLENBQVA7QUFDRDs7QUFSRDtBQVdGOztBQUNBO0FBQ0E7QUFDQTs7OztBQUNBLDZCQUFlLFVBQWYsRUFBNEJuRSxJQUFELElBQVUsSUFBSUYsV0FBSixDQUFnQkUsSUFBaEIsQ0FBckM7ZUFFZUYsVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgTWFuYWdlcyBTYWxlc2ZvcmNlIE1ldGFkYXRhIEFQSVxuICogQGF1dGhvciBTaGluaWNoaSBUb21pdGEgPHNoaW5pY2hpLnRvbWl0YUBnbWFpbC5jb20+XG4gKi9cbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgeyBSZWFkYWJsZSB9IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgeyByZWdpc3Rlck1vZHVsZSB9IGZyb20gJy4uL2pzZm9yY2UnO1xuaW1wb3J0IENvbm5lY3Rpb24gZnJvbSAnLi4vY29ubmVjdGlvbic7XG5pbXBvcnQgU09BUCBmcm9tICcuLi9zb2FwJztcbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSAnLi4vdXRpbC9mdW5jdGlvbic7XG5pbXBvcnQgeyBTY2hlbWEsIFNvYXBTY2hlbWFEZWYsIFNvYXBTY2hlbWEgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQge1xuICBBcGlTY2hlbWFzLFxuICBNZXRhZGF0YSxcbiAgUmVhZFJlc3VsdCxcbiAgU2F2ZVJlc3VsdCxcbiAgVXBzZXJ0UmVzdWx0LFxuICBMaXN0TWV0YWRhdGFRdWVyeSxcbiAgRmlsZVByb3BlcnRpZXMsXG4gIERlc2NyaWJlTWV0YWRhdGFSZXN1bHQsXG4gIFJldHJpZXZlUmVxdWVzdCxcbiAgRGVwbG95T3B0aW9ucyxcbiAgUmV0cmlldmVSZXN1bHQsXG4gIERlcGxveVJlc3VsdCxcbiAgQXN5bmNSZXN1bHQsXG4gIEFwaVNjaGVtYVR5cGVzLFxufSBmcm9tICcuL21ldGFkYXRhL3NjaGVtYSc7XG5leHBvcnQgKiBmcm9tICcuL21ldGFkYXRhL3NjaGVtYSc7XG5cbi8qKlxuICpcbiAqL1xudHlwZSBNZXRhZGF0YVR5cGVfPFxuICBLIGV4dGVuZHMga2V5b2YgQXBpU2NoZW1hVHlwZXMgPSBrZXlvZiBBcGlTY2hlbWFUeXBlc1xuPiA9IEsgZXh0ZW5kcyBrZXlvZiBBcGlTY2hlbWFUeXBlc1xuICA/IEFwaVNjaGVtYVR5cGVzW0tdIGV4dGVuZHMgTWV0YWRhdGFcbiAgICA/IEtcbiAgICA6IG5ldmVyXG4gIDogbmV2ZXI7XG5cbmV4cG9ydCB0eXBlIE1ldGFkYXRhVHlwZSA9IE1ldGFkYXRhVHlwZV87XG5cbmV4cG9ydCB0eXBlIE1ldGFkYXRhRGVmaW5pdGlvbjxcbiAgVCBleHRlbmRzIHN0cmluZyxcbiAgTSBleHRlbmRzIE1ldGFkYXRhID0gTWV0YWRhdGFcbj4gPSBNZXRhZGF0YSBleHRlbmRzIE1cbiAgPyBUIGV4dGVuZHMga2V5b2YgQXBpU2NoZW1hVHlwZXMgJiBNZXRhZGF0YVR5cGVcbiAgICA/IEFwaVNjaGVtYVR5cGVzW1RdIGV4dGVuZHMgTWV0YWRhdGFcbiAgICAgID8gQXBpU2NoZW1hVHlwZXNbVF1cbiAgICAgIDogTWV0YWRhdGFcbiAgICA6IE1ldGFkYXRhXG4gIDogTTtcblxudHlwZSBEZWVwUGFydGlhbDxUPiA9IFQgZXh0ZW5kcyBhbnlbXVxuICA/IERlZXBQYXJ0aWFsPFRbbnVtYmVyXT5bXVxuICA6IFQgZXh0ZW5kcyBvYmplY3RcbiAgPyB7IFtLIGluIGtleW9mIFRdPzogRGVlcFBhcnRpYWw8VFtLXT4gfVxuICA6IFQ7XG5cbmV4cG9ydCB0eXBlIElucHV0TWV0YWRhdGFEZWZpbml0aW9uPFxuICBUIGV4dGVuZHMgc3RyaW5nLFxuICBNIGV4dGVuZHMgTWV0YWRhdGEgPSBNZXRhZGF0YVxuPiA9IERlZXBQYXJ0aWFsPE1ldGFkYXRhRGVmaW5pdGlvbjxULCBNPj47XG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gZGVhbGxvY2F0ZVR5cGVXaXRoTWV0YWRhdGE8TSBleHRlbmRzIE1ldGFkYXRhPihtZXRhZGF0YTogTSk6IE0ge1xuICBjb25zdCB7ICQsIC4uLm1kIH0gPSBtZXRhZGF0YSBhcyBhbnk7XG4gIHJldHVybiBtZDtcbn1cblxuZnVuY3Rpb24gYXNzaWduVHlwZVdpdGhNZXRhZGF0YShtZXRhZGF0YTogTWV0YWRhdGEgfCBNZXRhZGF0YVtdLCB0eXBlOiBzdHJpbmcpIHtcbiAgY29uc3QgY29udmVydCA9IChtZDogTWV0YWRhdGEpID0+ICh7IFsnQHhzaTp0eXBlJ106IHR5cGUsIC4uLm1kIH0pO1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShtZXRhZGF0YSkgPyBtZXRhZGF0YS5tYXAoY29udmVydCkgOiBjb252ZXJ0KG1ldGFkYXRhKTtcbn1cblxuLyoqXG4gKiBDbGFzcyBmb3IgU2FsZXNmb3JjZSBNZXRhZGF0YSBBUElcbiAqL1xuZXhwb3J0IGNsYXNzIE1ldGFkYXRhQXBpPFMgZXh0ZW5kcyBTY2hlbWE+IHtcbiAgX2Nvbm46IENvbm5lY3Rpb248Uz47XG5cbiAgLyoqXG4gICAqIFBvbGxpbmcgaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzXG4gICAqL1xuICBwb2xsSW50ZXJ2YWw6IG51bWJlciA9IDEwMDA7XG5cbiAgLyoqXG4gICAqIFBvbGxpbmcgdGltZW91dCBpbiBtaWxsaXNlY29uZHNcbiAgICovXG4gIHBvbGxUaW1lb3V0OiBudW1iZXIgPSAxMDAwMDtcblxuICAvKipcbiAgICpcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbm46IENvbm5lY3Rpb248Uz4pIHtcbiAgICB0aGlzLl9jb25uID0gY29ubjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIE1ldGFkYXRhIEFQSSBTT0FQIGVuZHBvaW50XG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBfaW52b2tlKFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIG1lc3NhZ2U6IG9iamVjdCxcbiAgICBzY2hlbWE/OiBTb2FwU2NoZW1hIHwgU29hcFNjaGVtYURlZixcbiAgKSB7XG4gICAgY29uc3Qgc29hcEVuZHBvaW50ID0gbmV3IFNPQVAodGhpcy5fY29ubiwge1xuICAgICAgeG1sbnM6ICdodHRwOi8vc29hcC5zZm9yY2UuY29tLzIwMDYvMDQvbWV0YWRhdGEnLFxuICAgICAgZW5kcG9pbnRVcmw6IGAke3RoaXMuX2Nvbm4uaW5zdGFuY2VVcmx9L3NlcnZpY2VzL1NvYXAvbS8ke3RoaXMuX2Nvbm4udmVyc2lvbn1gLFxuICAgIH0pO1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IHNvYXBFbmRwb2ludC5pbnZva2UoXG4gICAgICBtZXRob2QsXG4gICAgICBtZXNzYWdlLFxuICAgICAgc2NoZW1hID8gKHsgcmVzdWx0OiBzY2hlbWEgfSBhcyBTb2FwU2NoZW1hKSA6IHVuZGVmaW5lZCxcbiAgICAgIEFwaVNjaGVtYXMsXG4gICAgKTtcbiAgICByZXR1cm4gcmVzLnJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgb25lIG9yIG1vcmUgbmV3IG1ldGFkYXRhIGNvbXBvbmVudHMgdG8gdGhlIG9yZ2FuaXphdGlvbi5cbiAgICovXG4gIGNyZWF0ZTxcbiAgICBNIGV4dGVuZHMgTWV0YWRhdGEgPSBNZXRhZGF0YSxcbiAgICBUIGV4dGVuZHMgTWV0YWRhdGFUeXBlID0gTWV0YWRhdGFUeXBlLFxuICAgIE1EIGV4dGVuZHMgSW5wdXRNZXRhZGF0YURlZmluaXRpb248VCwgTT4gPSBJbnB1dE1ldGFkYXRhRGVmaW5pdGlvbjxULCBNPlxuICA+KHR5cGU6IFQsIG1ldGFkYXRhOiBNRFtdKTogUHJvbWlzZTxTYXZlUmVzdWx0W10+O1xuICBjcmVhdGU8XG4gICAgTSBleHRlbmRzIE1ldGFkYXRhID0gTWV0YWRhdGEsXG4gICAgVCBleHRlbmRzIE1ldGFkYXRhVHlwZSA9IE1ldGFkYXRhVHlwZSxcbiAgICBNRCBleHRlbmRzIElucHV0TWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+ID0gSW5wdXRNZXRhZGF0YURlZmluaXRpb248VCwgTT5cbiAgPih0eXBlOiBULCBtZXRhZGF0YTogTUQpOiBQcm9taXNlPFNhdmVSZXN1bHQ+O1xuICBjcmVhdGU8XG4gICAgTSBleHRlbmRzIE1ldGFkYXRhID0gTWV0YWRhdGEsXG4gICAgVCBleHRlbmRzIE1ldGFkYXRhVHlwZSA9IE1ldGFkYXRhVHlwZSxcbiAgICBNRCBleHRlbmRzIElucHV0TWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+ID0gSW5wdXRNZXRhZGF0YURlZmluaXRpb248VCwgTT5cbiAgPih0eXBlOiBULCBtZXRhZGF0YTogTUQgfCBNRFtdKTogUHJvbWlzZTxTYXZlUmVzdWx0IHwgU2F2ZVJlc3VsdFtdPjtcbiAgY3JlYXRlKHR5cGU6IHN0cmluZywgbWV0YWRhdGE6IE1ldGFkYXRhIHwgTWV0YWRhdGFbXSkge1xuICAgIGNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KG1ldGFkYXRhKTtcbiAgICBtZXRhZGF0YSA9IGFzc2lnblR5cGVXaXRoTWV0YWRhdGEobWV0YWRhdGEsIHR5cGUpO1xuICAgIGNvbnN0IHNjaGVtYSA9IGlzQXJyYXkgPyBbQXBpU2NoZW1hcy5TYXZlUmVzdWx0XSA6IEFwaVNjaGVtYXMuU2F2ZVJlc3VsdDtcbiAgICByZXR1cm4gdGhpcy5faW52b2tlKCdjcmVhdGVNZXRhZGF0YScsIHsgbWV0YWRhdGEgfSwgc2NoZW1hKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHNwZWNpZmllZCBtZXRhZGF0YSBjb21wb25lbnRzIGluIHRoZSBvcmdhbml6YXRpb24uXG4gICAqL1xuICByZWFkPFxuICAgIE0gZXh0ZW5kcyBNZXRhZGF0YSA9IE1ldGFkYXRhLFxuICAgIFQgZXh0ZW5kcyBNZXRhZGF0YVR5cGUgPSBNZXRhZGF0YVR5cGUsXG4gICAgTUQgZXh0ZW5kcyBNZXRhZGF0YURlZmluaXRpb248VCwgTT4gPSBNZXRhZGF0YURlZmluaXRpb248VCwgTT5cbiAgPih0eXBlOiBULCBmdWxsTmFtZXM6IHN0cmluZ1tdKTogUHJvbWlzZTxNRFtdPjtcbiAgcmVhZDxcbiAgICBNIGV4dGVuZHMgTWV0YWRhdGEgPSBNZXRhZGF0YSxcbiAgICBUIGV4dGVuZHMgTWV0YWRhdGFUeXBlID0gTWV0YWRhdGFUeXBlLFxuICAgIE1EIGV4dGVuZHMgTWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+ID0gTWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+XG4gID4odHlwZTogVCwgZnVsbE5hbWVzOiBzdHJpbmcpOiBQcm9taXNlPE1EPjtcbiAgcmVhZDxcbiAgICBNIGV4dGVuZHMgTWV0YWRhdGEgPSBNZXRhZGF0YSxcbiAgICBUIGV4dGVuZHMgTWV0YWRhdGFUeXBlID0gTWV0YWRhdGFUeXBlLFxuICAgIE1EIGV4dGVuZHMgTWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+ID0gTWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+XG4gID4odHlwZTogVCwgZnVsbE5hbWVzOiBzdHJpbmcgfCBzdHJpbmdbXSk6IFByb21pc2U8TUQgfCBNRFtdPjtcbiAgYXN5bmMgcmVhZCh0eXBlOiBzdHJpbmcsIGZ1bGxOYW1lczogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBjb25zdCBSZWFkUmVzdWx0U2NoZW1hID1cbiAgICAgIHR5cGUgaW4gQXBpU2NoZW1hc1xuICAgICAgICA/ICh7XG4gICAgICAgICAgICB0eXBlOiBBcGlTY2hlbWFzLlJlYWRSZXN1bHQudHlwZSxcbiAgICAgICAgICAgIHByb3BzOiB7XG4gICAgICAgICAgICAgIHJlY29yZHM6IFt0eXBlXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSBhcyBjb25zdClcbiAgICAgICAgOiBBcGlTY2hlbWFzLlJlYWRSZXN1bHQ7XG4gICAgY29uc3QgcmVzOiBSZWFkUmVzdWx0ID0gYXdhaXQgdGhpcy5faW52b2tlKFxuICAgICAgJ3JlYWRNZXRhZGF0YScsXG4gICAgICB7IHR5cGUsIGZ1bGxOYW1lcyB9LFxuICAgICAgUmVhZFJlc3VsdFNjaGVtYSxcbiAgICApO1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KGZ1bGxOYW1lcylcbiAgICAgID8gcmVzLnJlY29yZHMubWFwKGRlYWxsb2NhdGVUeXBlV2l0aE1ldGFkYXRhKVxuICAgICAgOiBkZWFsbG9jYXRlVHlwZVdpdGhNZXRhZGF0YShyZXMucmVjb3Jkc1swXSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIG9uZSBvciBtb3JlIG1ldGFkYXRhIGNvbXBvbmVudHMgaW4gdGhlIG9yZ2FuaXphdGlvbi5cbiAgICovXG4gIHVwZGF0ZTxcbiAgICBNIGV4dGVuZHMgTWV0YWRhdGEgPSBNZXRhZGF0YSxcbiAgICBUIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLFxuICAgIE1EIGV4dGVuZHMgSW5wdXRNZXRhZGF0YURlZmluaXRpb248VCwgTT4gPSBJbnB1dE1ldGFkYXRhRGVmaW5pdGlvbjxULCBNPlxuICA+KHR5cGU6IFQsIG1ldGFkYXRhOiBQYXJ0aWFsPE1EPltdKTogUHJvbWlzZTxTYXZlUmVzdWx0W10+O1xuICB1cGRhdGU8XG4gICAgTSBleHRlbmRzIE1ldGFkYXRhID0gTWV0YWRhdGEsXG4gICAgVCBleHRlbmRzIHN0cmluZyA9IHN0cmluZyxcbiAgICBNRCBleHRlbmRzIElucHV0TWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+ID0gSW5wdXRNZXRhZGF0YURlZmluaXRpb248VCwgTT5cbiAgPih0eXBlOiBULCBtZXRhZGF0YTogUGFydGlhbDxNRD4pOiBQcm9taXNlPFNhdmVSZXN1bHQ+O1xuICB1cGRhdGU8XG4gICAgTSBleHRlbmRzIE1ldGFkYXRhID0gTWV0YWRhdGEsXG4gICAgVCBleHRlbmRzIHN0cmluZyA9IHN0cmluZyxcbiAgICBNRCBleHRlbmRzIElucHV0TWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+ID0gSW5wdXRNZXRhZGF0YURlZmluaXRpb248VCwgTT5cbiAgPihcbiAgICB0eXBlOiBULFxuICAgIG1ldGFkYXRhOiBQYXJ0aWFsPE1EPiB8IFBhcnRpYWw8TUQ+W10sXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdCB8IFNhdmVSZXN1bHRbXT47XG4gIHVwZGF0ZSh0eXBlOiBzdHJpbmcsIG1ldGFkYXRhOiBNZXRhZGF0YSB8IE1ldGFkYXRhW10pIHtcbiAgICBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheShtZXRhZGF0YSk7XG4gICAgbWV0YWRhdGEgPSBhc3NpZ25UeXBlV2l0aE1ldGFkYXRhKG1ldGFkYXRhLCB0eXBlKTtcbiAgICBjb25zdCBzY2hlbWEgPSBpc0FycmF5ID8gW0FwaVNjaGVtYXMuU2F2ZVJlc3VsdF0gOiBBcGlTY2hlbWFzLlNhdmVSZXN1bHQ7XG4gICAgcmV0dXJuIHRoaXMuX2ludm9rZSgndXBkYXRlTWV0YWRhdGEnLCB7IG1ldGFkYXRhIH0sIHNjaGVtYSk7XG4gIH1cblxuICAvKipcbiAgICogVXBzZXJ0IG9uZSBvciBtb3JlIGNvbXBvbmVudHMgaW4geW91ciBvcmdhbml6YXRpb24ncyBkYXRhLlxuICAgKi9cbiAgdXBzZXJ0PFxuICAgIE0gZXh0ZW5kcyBNZXRhZGF0YSA9IE1ldGFkYXRhLFxuICAgIFQgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmcsXG4gICAgTUQgZXh0ZW5kcyBJbnB1dE1ldGFkYXRhRGVmaW5pdGlvbjxULCBNPiA9IElucHV0TWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+XG4gID4odHlwZTogVCwgbWV0YWRhdGE6IE1EW10pOiBQcm9taXNlPFVwc2VydFJlc3VsdFtdPjtcbiAgdXBzZXJ0PFxuICAgIE0gZXh0ZW5kcyBNZXRhZGF0YSA9IE1ldGFkYXRhLFxuICAgIFQgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmcsXG4gICAgTUQgZXh0ZW5kcyBJbnB1dE1ldGFkYXRhRGVmaW5pdGlvbjxULCBNPiA9IElucHV0TWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+XG4gID4odHlwZTogVCwgbWV0YWRhdGE6IE1EKTogUHJvbWlzZTxVcHNlcnRSZXN1bHQ+O1xuICB1cHNlcnQ8XG4gICAgTSBleHRlbmRzIE1ldGFkYXRhID0gTWV0YWRhdGEsXG4gICAgVCBleHRlbmRzIHN0cmluZyA9IHN0cmluZyxcbiAgICBNRCBleHRlbmRzIElucHV0TWV0YWRhdGFEZWZpbml0aW9uPFQsIE0+ID0gSW5wdXRNZXRhZGF0YURlZmluaXRpb248VCwgTT5cbiAgPih0eXBlOiBULCBtZXRhZGF0YTogTUQgfCBNRFtdKTogUHJvbWlzZTxVcHNlcnRSZXN1bHQgfCBVcHNlcnRSZXN1bHRbXT47XG4gIHVwc2VydCh0eXBlOiBzdHJpbmcsIG1ldGFkYXRhOiBNZXRhZGF0YSB8IE1ldGFkYXRhW10pIHtcbiAgICBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheShtZXRhZGF0YSk7XG4gICAgbWV0YWRhdGEgPSBhc3NpZ25UeXBlV2l0aE1ldGFkYXRhKG1ldGFkYXRhLCB0eXBlKTtcbiAgICBjb25zdCBzY2hlbWEgPSBpc0FycmF5XG4gICAgICA/IFtBcGlTY2hlbWFzLlVwc2VydFJlc3VsdF1cbiAgICAgIDogQXBpU2NoZW1hcy5VcHNlcnRSZXN1bHQ7XG4gICAgcmV0dXJuIHRoaXMuX2ludm9rZSgndXBzZXJ0TWV0YWRhdGEnLCB7IG1ldGFkYXRhIH0sIHNjaGVtYSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBzcGVjaWZpZWQgbWV0YWRhdGEgY29tcG9uZW50cyBpbiB0aGUgb3JnYW5pemF0aW9uLlxuICAgKi9cbiAgZGVsZXRlKHR5cGU6IHN0cmluZywgZnVsbE5hbWVzOiBzdHJpbmdbXSk6IFByb21pc2U8U2F2ZVJlc3VsdFtdPjtcbiAgZGVsZXRlKHR5cGU6IHN0cmluZywgZnVsbE5hbWVzOiBzdHJpbmcpOiBQcm9taXNlPFNhdmVSZXN1bHQ+O1xuICBkZWxldGUoXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIGZ1bGxOYW1lczogc3RyaW5nIHwgc3RyaW5nW10sXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdCB8IFNhdmVSZXN1bHRbXT47XG4gIGRlbGV0ZSh0eXBlOiBzdHJpbmcsIGZ1bGxOYW1lczogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBjb25zdCBzY2hlbWEgPSBBcnJheS5pc0FycmF5KGZ1bGxOYW1lcylcbiAgICAgID8gW0FwaVNjaGVtYXMuU2F2ZVJlc3VsdF1cbiAgICAgIDogQXBpU2NoZW1hcy5TYXZlUmVzdWx0O1xuICAgIHJldHVybiB0aGlzLl9pbnZva2UoJ2RlbGV0ZU1ldGFkYXRhJywgeyB0eXBlLCBmdWxsTmFtZXMgfSwgc2NoZW1hKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5hbWUgZnVsbG5hbWUgb2YgYSBtZXRhZGF0YSBjb21wb25lbnQgaW4gdGhlIG9yZ2FuaXphdGlvblxuICAgKi9cbiAgcmVuYW1lKFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBvbGRGdWxsTmFtZTogc3RyaW5nLFxuICAgIG5ld0Z1bGxOYW1lOiBzdHJpbmcsXG4gICk6IFByb21pc2U8U2F2ZVJlc3VsdD4ge1xuICAgIHJldHVybiB0aGlzLl9pbnZva2UoXG4gICAgICAncmVuYW1lTWV0YWRhdGEnLFxuICAgICAgeyB0eXBlLCBvbGRGdWxsTmFtZSwgbmV3RnVsbE5hbWUgfSxcbiAgICAgIEFwaVNjaGVtYXMuU2F2ZVJlc3VsdCxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgbWV0YWRhdGEgd2hpY2ggZGVzY3JpYmVzIHlvdXIgb3JnYW5pemF0aW9uLCBpbmNsdWRpbmcgQXBleCBjbGFzc2VzIGFuZCB0cmlnZ2VycyxcbiAgICogY3VzdG9tIG9iamVjdHMsIGN1c3RvbSBmaWVsZHMgb24gc3RhbmRhcmQgb2JqZWN0cywgdGFiIHNldHMgdGhhdCBkZWZpbmUgYW4gYXBwLFxuICAgKiBhbmQgbWFueSBvdGhlciBjb21wb25lbnRzLlxuICAgKi9cbiAgZGVzY3JpYmUoYXNPZlZlcnNpb24/OiBzdHJpbmcpOiBQcm9taXNlPERlc2NyaWJlTWV0YWRhdGFSZXN1bHQ+IHtcbiAgICBpZiAoIWFzT2ZWZXJzaW9uKSB7XG4gICAgICBhc09mVmVyc2lvbiA9IHRoaXMuX2Nvbm4udmVyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2ludm9rZShcbiAgICAgICdkZXNjcmliZU1ldGFkYXRhJyxcbiAgICAgIHsgYXNPZlZlcnNpb24gfSxcbiAgICAgIEFwaVNjaGVtYXMuRGVzY3JpYmVNZXRhZGF0YVJlc3VsdCxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBwcm9wZXJ0eSBpbmZvcm1hdGlvbiBhYm91dCBtZXRhZGF0YSBjb21wb25lbnRzIGluIHlvdXIgb3JnYW5pemF0aW9uXG4gICAqL1xuICBsaXN0KFxuICAgIHF1ZXJpZXM6IExpc3RNZXRhZGF0YVF1ZXJ5IHwgTGlzdE1ldGFkYXRhUXVlcnlbXSxcbiAgICBhc09mVmVyc2lvbj86IHN0cmluZyxcbiAgKTogUHJvbWlzZTxGaWxlUHJvcGVydGllc1tdPiB7XG4gICAgaWYgKCFhc09mVmVyc2lvbikge1xuICAgICAgYXNPZlZlcnNpb24gPSB0aGlzLl9jb25uLnZlcnNpb247XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pbnZva2UoJ2xpc3RNZXRhZGF0YScsIHsgcXVlcmllcywgYXNPZlZlcnNpb24gfSwgW1xuICAgICAgQXBpU2NoZW1hcy5GaWxlUHJvcGVydGllcyxcbiAgICBdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIHN0YXR1cyBvZiBhc3luY2hyb25vdXMgbWV0YWRhdGEgY2FsbHNcbiAgICovXG4gIGNoZWNrU3RhdHVzKGFzeW5jUHJvY2Vzc0lkOiBzdHJpbmcpIHtcbiAgICBjb25zdCByZXMgPSB0aGlzLl9pbnZva2UoXG4gICAgICAnY2hlY2tTdGF0dXMnLFxuICAgICAgeyBhc3luY1Byb2Nlc3NJZCB9LFxuICAgICAgQXBpU2NoZW1hcy5Bc3luY1Jlc3VsdCxcbiAgICApO1xuICAgIHJldHVybiBuZXcgQXN5bmNSZXN1bHRMb2NhdG9yKHRoaXMsIHJlcyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIFhNTCBmaWxlIHJlcHJlc2VudGF0aW9ucyBvZiBjb21wb25lbnRzIGluIGFuIG9yZ2FuaXphdGlvblxuICAgKi9cbiAgcmV0cmlldmUocmVxdWVzdDogUGFydGlhbDxSZXRyaWV2ZVJlcXVlc3Q+KSB7XG4gICAgY29uc3QgcmVzID0gdGhpcy5faW52b2tlKFxuICAgICAgJ3JldHJpZXZlJyxcbiAgICAgIHsgcmVxdWVzdCB9LFxuICAgICAgQXBpU2NoZW1hcy5SZXRyaWV2ZVJlc3VsdCxcbiAgICApO1xuICAgIHJldHVybiBuZXcgUmV0cmlldmVSZXN1bHRMb2NhdG9yKHRoaXMsIHJlcyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZGVjbGFyYXRpdmUgbWV0YWRhdGEgY2FsbCByZXRyaWV2ZSgpIGFuZCByZXR1cm5zIHRoZSB6aXAgZmlsZSBjb250ZW50c1xuICAgKi9cbiAgY2hlY2tSZXRyaWV2ZVN0YXR1cyhhc3luY1Byb2Nlc3NJZDogc3RyaW5nKTogUHJvbWlzZTxSZXRyaWV2ZVJlc3VsdD4ge1xuICAgIHJldHVybiB0aGlzLl9pbnZva2UoXG4gICAgICAnY2hlY2tSZXRyaWV2ZVN0YXR1cycsXG4gICAgICB7IGFzeW5jUHJvY2Vzc0lkIH0sXG4gICAgICBBcGlTY2hlbWFzLlJldHJpZXZlUmVzdWx0LFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogRGVwbG95IGNvbXBvbmVudHMgaW50byBhbiBvcmdhbml6YXRpb24gdXNpbmcgemlwcGVkIGZpbGUgcmVwcmVzZW50YXRpb25zXG4gICAqL1xuICBkZXBsb3koXG4gICAgemlwSW5wdXQ6IFJlYWRhYmxlIHwgQnVmZmVyIHwgc3RyaW5nLFxuICAgIG9wdGlvbnM6IFBhcnRpYWw8RGVwbG95T3B0aW9ucz4gPSB7fSxcbiAgKSB7XG4gICAgY29uc3QgcmVzID0gKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHppcENvbnRlbnRCNjQgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBpc09iamVjdCh6aXBJbnB1dCkgJiZcbiAgICAgICAgICAncGlwZScgaW4gemlwSW5wdXQgJiZcbiAgICAgICAgICB0eXBlb2YgemlwSW5wdXQucGlwZSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zdCBidWZzOiBCdWZmZXJbXSA9IFtdO1xuICAgICAgICAgIHppcElucHV0Lm9uKCdkYXRhJywgKGQpID0+IGJ1ZnMucHVzaChkKSk7XG4gICAgICAgICAgemlwSW5wdXQub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICAgICAgICB6aXBJbnB1dC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShCdWZmZXIuY29uY2F0KGJ1ZnMpLnRvU3RyaW5nKCdiYXNlNjQnKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgLy8gemlwSW5wdXQucmVzdW1lKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoemlwSW5wdXQgaW5zdGFuY2VvZiBCdWZmZXIpIHtcbiAgICAgICAgICByZXNvbHZlKHppcElucHV0LnRvU3RyaW5nKCdiYXNlNjQnKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoemlwSW5wdXQgaW5zdGFuY2VvZiBTdHJpbmcgfHwgdHlwZW9mIHppcElucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJlc29sdmUoemlwSW5wdXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93ICdVbmV4cGVjdGVkIHppcElucHV0IHR5cGUnO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRoaXMuX2ludm9rZShcbiAgICAgICAgJ2RlcGxveScsXG4gICAgICAgIHtcbiAgICAgICAgICBaaXBGaWxlOiB6aXBDb250ZW50QjY0LFxuICAgICAgICAgIERlcGxveU9wdGlvbnM6IG9wdGlvbnMsXG4gICAgICAgIH0sXG4gICAgICAgIEFwaVNjaGVtYXMuRGVwbG95UmVzdWx0LFxuICAgICAgKTtcbiAgICB9KSgpO1xuXG4gICAgcmV0dXJuIG5ldyBEZXBsb3lSZXN1bHRMb2NhdG9yKHRoaXMsIHJlcyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZGVjbGFyYXRpdmUgbWV0YWRhdGEgY2FsbCBkZXBsb3koKVxuICAgKi9cbiAgY2hlY2tEZXBsb3lTdGF0dXMoXG4gICAgYXN5bmNQcm9jZXNzSWQ6IHN0cmluZyxcbiAgICBpbmNsdWRlRGV0YWlsczogYm9vbGVhbiA9IGZhbHNlLFxuICApOiBQcm9taXNlPERlcGxveVJlc3VsdD4ge1xuICAgIHJldHVybiB0aGlzLl9pbnZva2UoXG4gICAgICAnY2hlY2tEZXBsb3lTdGF0dXMnLFxuICAgICAge1xuICAgICAgICBhc3luY1Byb2Nlc3NJZCxcbiAgICAgICAgaW5jbHVkZURldGFpbHMsXG4gICAgICB9LFxuICAgICAgQXBpU2NoZW1hcy5EZXBsb3lSZXN1bHQsXG4gICAgKTtcbiAgfVxufVxuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuLyoqXG4gKiBUaGUgbG9jYXRvciBjbGFzcyBmb3IgTWV0YWRhdGEgQVBJIGFzeW5jaHJvbm91cyBjYWxsIHJlc3VsdFxuICovXG5leHBvcnQgY2xhc3MgQXN5bmNSZXN1bHRMb2NhdG9yPFxuICBTIGV4dGVuZHMgU2NoZW1hLFxuICBSIGV4dGVuZHMge30gPSBBc3luY1Jlc3VsdFxuPiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIF9tZXRhOiBNZXRhZGF0YUFwaTxTPjtcbiAgX3Byb21pc2U6IFByb21pc2U8QXN5bmNSZXN1bHQ+O1xuICBfaWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICpcbiAgICovXG4gIGNvbnN0cnVjdG9yKG1ldGE6IE1ldGFkYXRhQXBpPFM+LCBwcm9taXNlOiBQcm9taXNlPEFzeW5jUmVzdWx0Pikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5fbWV0YSA9IG1ldGE7XG4gICAgdGhpcy5fcHJvbWlzZSA9IHByb21pc2U7XG4gIH1cblxuICAvKipcbiAgICogUHJvbWlzZS9BKyBpbnRlcmZhY2VcbiAgICogaHR0cDovL3Byb21pc2VzLWFwbHVzLmdpdGh1Yi5pby9wcm9taXNlcy1zcGVjL1xuICAgKlxuICAgKiBAbWV0aG9kIE1ldGFkYXRhfkFzeW5jUmVzdWx0TG9jYXRvciN0aGVuXG4gICAqL1xuICB0aGVuPFUsIFY+KFxuICAgIG9uUmVzb2x2ZT86ICgocmVzdWx0OiBBc3luY1Jlc3VsdCkgPT4gVSB8IFByb21pc2U8VT4pIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgICBvblJlamVjdD86ICgoZXJyOiBFcnJvcikgPT4gViB8IFByb21pc2U8Vj4pIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgKTogUHJvbWlzZTxVIHwgVj4ge1xuICAgIHJldHVybiB0aGlzLl9wcm9taXNlLnRoZW4ob25SZXNvbHZlLCBvblJlamVjdCk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIHN0YXR1cyBvZiBhc3luYyByZXF1ZXN0XG4gICAqL1xuICBhc3luYyBjaGVjaygpIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLl9wcm9taXNlO1xuICAgIHRoaXMuX2lkID0gcmVzdWx0LmlkO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLl9tZXRhLmNoZWNrU3RhdHVzKHJlc3VsdC5pZCk7XG4gIH1cblxuICAvKipcbiAgICogUG9sbGluZyB1bnRpbCBhc3luYyBjYWxsIHN0YXR1cyBiZWNvbWVzIGNvbXBsZXRlIG9yIGVycm9yXG4gICAqL1xuICBwb2xsKGludGVydmFsOiBudW1iZXIsIHRpbWVvdXQ6IG51bWJlcikge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGNvbnN0IHBvbGwgPSBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgaWYgKHN0YXJ0VGltZSArIHRpbWVvdXQgPCBub3cpIHtcbiAgICAgICAgICBsZXQgZXJyTXNnID0gJ1BvbGxpbmcgdGltZSBvdXQuJztcbiAgICAgICAgICBpZiAodGhpcy5faWQpIHtcbiAgICAgICAgICAgIGVyck1zZyArPSAnIFByb2Nlc3MgSWQgPSAnICsgdGhpcy5faWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoZXJyTXNnKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY2hlY2soKTtcbiAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdjb21wbGV0ZScsIHJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdwcm9ncmVzcycsIHJlc3VsdCk7XG4gICAgICAgICAgc2V0VGltZW91dChwb2xsLCBpbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHNldFRpbWVvdXQocG9sbCwgaW50ZXJ2YWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGFuZCB3YWl0IHVudGlsIHRoZSBhc3luYyByZXF1ZXN0cyBiZWNvbWUgaW4gY29tcGxldGVkIHN0YXR1c1xuICAgKi9cbiAgY29tcGxldGUoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMub24oJ2NvbXBsZXRlJywgcmVzb2x2ZSk7XG4gICAgICB0aGlzLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICB0aGlzLnBvbGwodGhpcy5fbWV0YS5wb2xsSW50ZXJ2YWwsIHRoaXMuX21ldGEucG9sbFRpbWVvdXQpO1xuICAgIH0pO1xuICB9XG59XG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuLyoqXG4gKiBUaGUgbG9jYXRvciBjbGFzcyB0byB0cmFjayByZXRyZWl2ZSgpIE1ldGFkYXRhIEFQSSBjYWxsIHJlc3VsdFxuICovXG5leHBvcnQgY2xhc3MgUmV0cmlldmVSZXN1bHRMb2NhdG9yPFMgZXh0ZW5kcyBTY2hlbWE+IGV4dGVuZHMgQXN5bmNSZXN1bHRMb2NhdG9yPFxuICBTLFxuICBSZXRyaWV2ZVJlc3VsdFxuPiB7XG4gIC8qKlxuICAgKiBDaGVjayBhbmQgd2FpdCB1bnRpbCB0aGUgYXN5bmMgcmVxdWVzdCBiZWNvbWVzIGluIGNvbXBsZXRlZCBzdGF0dXMsXG4gICAqIGFuZCByZXRyaWV2ZSB0aGUgcmVzdWx0IGRhdGEuXG4gICAqL1xuICBhc3luYyBjb21wbGV0ZSgpIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzdXBlci5jb21wbGV0ZSgpO1xuICAgIHJldHVybiB0aGlzLl9tZXRhLmNoZWNrUmV0cmlldmVTdGF0dXMocmVzdWx0LmlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGFuZ2UgdGhlIHJldHJpZXZlZCByZXN1bHQgdG8gTm9kZS5qcyByZWFkYWJsZSBzdHJlYW1cbiAgICovXG4gIHN0cmVhbSgpIHtcbiAgICBjb25zdCByZXN1bHRTdHJlYW0gPSBuZXcgUmVhZGFibGUoKTtcbiAgICBsZXQgcmVhZGluZyA9IGZhbHNlO1xuICAgIHJlc3VsdFN0cmVhbS5fcmVhZCA9IGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChyZWFkaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHJlYWRpbmcgPSB0cnVlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jb21wbGV0ZSgpO1xuICAgICAgICByZXN1bHRTdHJlYW0ucHVzaChCdWZmZXIuZnJvbShyZXN1bHQuemlwRmlsZSwgJ2Jhc2U2NCcpKTtcbiAgICAgICAgcmVzdWx0U3RyZWFtLnB1c2gobnVsbCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlc3VsdFN0cmVhbS5lbWl0KCdlcnJvcicsIGUpO1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHJlc3VsdFN0cmVhbTtcbiAgfVxufVxuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cbi8qKlxuICogVGhlIGxvY2F0b3IgY2xhc3MgdG8gdHJhY2sgZGVwbG95KCkgTWV0YWRhdGEgQVBJIGNhbGwgcmVzdWx0XG4gKlxuICogQHByb3RlY3RlZFxuICogQGNsYXNzIE1ldGFkYXRhfkRlcGxveVJlc3VsdExvY2F0b3JcbiAqIEBleHRlbmRzIE1ldGFkYXRhfkFzeW5jUmVzdWx0TG9jYXRvclxuICogQHBhcmFtIHtNZXRhZGF0YX0gbWV0YSAtIE1ldGFkYXRhIEFQSSBvYmplY3RcbiAqIEBwYXJhbSB7UHJvbWlzZS48TWV0YWRhdGF+QXN5bmNSZXN1bHQ+fSByZXN1bHQgLSBQcm9taXNlIG9iamVjdCBmb3IgYXN5bmMgcmVzdWx0IG9mIGRlcGxveSgpIGNhbGxcbiAqL1xuZXhwb3J0IGNsYXNzIERlcGxveVJlc3VsdExvY2F0b3I8UyBleHRlbmRzIFNjaGVtYT4gZXh0ZW5kcyBBc3luY1Jlc3VsdExvY2F0b3I8XG4gIFMsXG4gIERlcGxveVJlc3VsdFxuPiB7XG4gIC8qKlxuICAgKiBDaGVjayBhbmQgd2FpdCB1bnRpbCB0aGUgYXN5bmMgcmVxdWVzdCBiZWNvbWVzIGluIGNvbXBsZXRlZCBzdGF0dXMsXG4gICAqIGFuZCByZXRyaWV2ZSB0aGUgcmVzdWx0IGRhdGEuXG4gICAqL1xuICBhc3luYyBjb21wbGV0ZShpbmNsdWRlRGV0YWlscz86IGJvb2xlYW4pIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzdXBlci5jb21wbGV0ZSgpO1xuICAgIHJldHVybiB0aGlzLl9tZXRhLmNoZWNrRGVwbG95U3RhdHVzKHJlc3VsdC5pZCwgaW5jbHVkZURldGFpbHMpO1xuICB9XG59XG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuLypcbiAqIFJlZ2lzdGVyIGhvb2sgaW4gY29ubmVjdGlvbiBpbnN0YW50aWF0aW9uIGZvciBkeW5hbWljYWxseSBhZGRpbmcgdGhpcyBBUEkgbW9kdWxlIGZlYXR1cmVzXG4gKi9cbnJlZ2lzdGVyTW9kdWxlKCdtZXRhZGF0YScsIChjb25uKSA9PiBuZXcgTWV0YWRhdGFBcGkoY29ubikpO1xuXG5leHBvcnQgZGVmYXVsdCBNZXRhZGF0YUFwaTtcbiJdfQ==