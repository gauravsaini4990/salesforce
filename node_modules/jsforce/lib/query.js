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

require("core-js/modules/es.array.sort");

require("core-js/modules/es.promise");

_Object$defineProperty(exports, "__esModule", {
  value: true
});

exports.default = exports.SubQuery = exports.Query = exports.ResponseTargets = void 0;

var _keys = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/object/keys"));

var _entries = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/object/entries"));

var _map = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/map"));

var _isArray = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/array/is-array"));

var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/objectWithoutProperties"));

var _indexOf = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/index-of"));

var _sort = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/sort"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/defineProperty"));

var _reduce = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/reduce"));

var _events = require("events");

var _logger = require("./util/logger");

var _recordStream = _interopRequireWildcard(require("./record-stream"));

var _soqlBuilder = require("./soql-builder");

function ownKeys(object, enumerableOnly) { var keys = _Object$keys2(object); if (_Object$getOwnPropertySymbols) { var symbols = _Object$getOwnPropertySymbols(object); if (enumerableOnly) symbols = _filterInstanceProperty(symbols).call(symbols, function (sym) { return _Object$getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { var _context12; _forEachInstanceProperty(_context12 = ownKeys(Object(source), true)).call(_context12, function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (_Object$getOwnPropertyDescriptors) { _Object$defineProperties(target, _Object$getOwnPropertyDescriptors(source)); } else { var _context13; _forEachInstanceProperty(_context13 = ownKeys(Object(source))).call(_context13, function (key) { _Object$defineProperty(target, key, _Object$getOwnPropertyDescriptor(source, key)); }); } } return target; }

const ResponseTargetValues = ['QueryResult', 'Records', 'SingleRecord', 'Count'];
const ResponseTargets = (0, _reduce.default)(ResponseTargetValues).call(ResponseTargetValues, (values, target) => _objectSpread(_objectSpread({}, values), {}, {
  [target]: target
}), {});
exports.ResponseTargets = ResponseTargets;

/**
 *
 */
const DEFAULT_BULK_THRESHOLD = 200;
/**
 * Query
 */

class Query extends _events.EventEmitter {
  /**
   *
   */
  constructor(conn, config, options) {
    super();
    (0, _defineProperty2.default)(this, "_conn", void 0);
    (0, _defineProperty2.default)(this, "_logger", void 0);
    (0, _defineProperty2.default)(this, "_soql", void 0);
    (0, _defineProperty2.default)(this, "_locator", void 0);
    (0, _defineProperty2.default)(this, "_config", {});
    (0, _defineProperty2.default)(this, "_children", []);
    (0, _defineProperty2.default)(this, "_options", void 0);
    (0, _defineProperty2.default)(this, "_executed", false);
    (0, _defineProperty2.default)(this, "_finished", false);
    (0, _defineProperty2.default)(this, "_chaining", false);
    (0, _defineProperty2.default)(this, "_promise", void 0);
    (0, _defineProperty2.default)(this, "_stream", void 0);
    (0, _defineProperty2.default)(this, "totalSize", void 0);
    (0, _defineProperty2.default)(this, "totalFetched", void 0);
    (0, _defineProperty2.default)(this, "offset", this.skip);
    (0, _defineProperty2.default)(this, "orderby", (0, _sort.default)(this));
    (0, _defineProperty2.default)(this, "exec", this.execute);
    (0, _defineProperty2.default)(this, "run", this.execute);
    (0, _defineProperty2.default)(this, "delete", this.destroy);
    (0, _defineProperty2.default)(this, "del", this.destroy);
    this._conn = conn;
    this._logger = conn._logLevel ? Query._logger.createInstance(conn._logLevel) : Query._logger;

    if (typeof config === 'string') {
      this._soql = config;
    } else if (typeof config.locator === 'string') {
      const locator = config.locator;

      if ((0, _indexOf.default)(locator).call(locator, '/') >= 0) {
        this._locator = locator.split('/').pop();
      }
    } else {
      const _ref = config,
            {
        fields,
        includes,
        sort
      } = _ref,
            _config = (0, _objectWithoutProperties2.default)(_ref, ["fields", "includes", "sort"]);

      this._config = _config;
      this.select(fields);

      if (includes) {
        this.includeChildren(includes);
      }

      if (sort) {
        var _context;

        (0, _sort.default)(_context = this).call(_context, sort);
      }
    }

    this._options = _objectSpread({
      headers: {},
      maxFetch: 10000,
      autoFetch: false,
      scanAll: false,
      responseTarget: 'QueryResult'
    }, options || {}); // promise instance

    this._promise = new _promise.default((resolve, reject) => {
      this.on('response', resolve);
      this.on('error', reject);
    });
    this._stream = new _recordStream.Serializable();
    this.on('record', record => this._stream.push(record));
    this.on('end', () => this._stream.push(null));
    this.on('error', err => {
      try {
        this._stream.emit('error', err);
      } catch (e) {// eslint-disable-line no-empty
      }
    });
  }
  /**
   * Select fields to include in the returning result
   */


  select(fields = '*') {
    if (this._soql) {
      throw Error('Cannot set select fields for the query which has already built SOQL.');
    }

    function toFieldArray(fields) {
      var _context2, _context3, _context4, _context5;

      return typeof fields === 'string' ? fields.split(/\s*,\s*/) : (0, _isArray.default)(fields) ? (0, _reduce.default)(_context2 = (0, _map.default)(_context3 = fields).call(_context3, toFieldArray)).call(_context2, (fs, f) => [...fs, ...f], []) : (0, _reduce.default)(_context4 = (0, _map.default)(_context5 = (0, _entries.default)(fields)).call(_context5, ([f, v]) => {
        if (typeof v === 'number' || typeof v === 'boolean') {
          return v ? [f] : [];
        } else {
          var _context6;

          return (0, _map.default)(_context6 = toFieldArray(v)).call(_context6, p => `${f}.${p}`);
        }
      })).call(_context4, (fs, f) => [...fs, ...f], []);
    }

    if (fields) {
      this._config.fields = toFieldArray(fields);
    } // force convert query record type without changing instance;


    return this;
  }
  /**
   * Set query conditions to filter the result records
   */


  where(conditions) {
    if (this._soql) {
      throw Error('Cannot set where conditions for the query which has already built SOQL.');
    }

    this._config.conditions = conditions;
    return this;
  }
  /**
   * Limit the returning result
   */


  limit(limit) {
    if (this._soql) {
      throw Error('Cannot set limit for the query which has already built SOQL.');
    }

    this._config.limit = limit;
    return this;
  }
  /**
   * Skip records
   */


  skip(offset) {
    if (this._soql) {
      throw Error('Cannot set skip/offset for the query which has already built SOQL.');
    }

    this._config.offset = offset;
    return this;
  }
  /**
   * Synonym of Query#skip()
   */


  sort(sort, dir) {
    if (this._soql) {
      throw Error('Cannot set sort for the query which has already built SOQL.');
    }

    if (typeof sort === 'string' && typeof dir !== 'undefined') {
      this._config.sort = [[sort, dir]];
    } else {
      this._config.sort = sort;
    }

    return this;
  }
  /**
   * Synonym of Query#sort()
   */


  include(childRelName, conditions, fields, options = {}) {
    if (this._soql) {
      throw Error('Cannot include child relationship into the query which has already built SOQL.');
    }

    const childConfig = {
      fields: fields === null ? undefined : fields,
      table: childRelName,
      conditions: conditions === null ? undefined : conditions,
      limit: options.limit,
      offset: options.offset,
      sort: (0, _sort.default)(options)
    }; // eslint-disable-next-line no-use-before-define

    const childQuery = new SubQuery(this._conn, childRelName, childConfig, this);

    this._children.push(childQuery);

    return childQuery;
  }
  /**
   * Include child relationship queryies, but not moving down to the children context
   */


  includeChildren(includes) {
    if (this._soql) {
      throw Error('Cannot include child relationship into the query which has already built SOQL.');
    }

    for (const crname of (0, _keys.default)(includes)) {
      const _ref2 = includes[crname],
            {
        conditions,
        fields
      } = _ref2,
            options = (0, _objectWithoutProperties2.default)(_ref2, ["conditions", "fields"]);
      this.include(crname, conditions, fields, options);
    }

    return this;
  }
  /**
   * Setting maxFetch query option
   */


  maxFetch(maxFetch) {
    this._options.maxFetch = maxFetch;
    return this;
  }
  /**
   * Switching auto fetch mode
   */


  autoFetch(autoFetch) {
    this._options.autoFetch = autoFetch;
    return this;
  }
  /**
   * Set flag to scan all records including deleted and archived.
   */


  scanAll(scanAll) {
    this._options.scanAll = scanAll;
    return this;
  }
  /**
   *
   */


  setResponseTarget(responseTarget) {
    if (responseTarget in ResponseTargets) {
      this._options.responseTarget = responseTarget;
    } // force change query response target without changing instance


    return this;
  }
  /**
   * Execute query and fetch records from server.
   */


  execute(options_ = {}) {
    if (this._executed) {
      throw new Error('re-executing already executed query');
    }

    if (this._finished) {
      throw new Error('executing already closed query');
    }

    const options = {
      headers: options_.headers || this._options.headers,
      responseTarget: options_.responseTarget || this._options.responseTarget,
      autoFetch: options_.autoFetch || this._options.autoFetch,
      maxFetch: options_.maxFetch || this._options.maxFetch,
      scanAll: options_.scanAll || this._options.scanAll
    }; // collect fetched records in array
    // only when response target is Records and
    // either callback or chaining promises are available to this query.

    this.once('fetch', () => {
      if (options.responseTarget === ResponseTargets.Records && this._chaining) {
        this._logger.debug('--- collecting all fetched records ---');

        const records = [];

        const onRecord = record => records.push(record);

        this.on('record', onRecord);
        this.once('end', () => {
          this.removeListener('record', onRecord);
          this.emit('response', records, this);
        });
      }
    }); // flag to prevent re-execution

    this._executed = true;

    (async () => {
      // start actual query
      this._logger.debug('>>> Query start >>>');

      try {
        await this._execute(options);

        this._logger.debug('*** Query finished ***');
      } catch (error) {
        this._logger.debug('--- Query error ---', error);

        this.emit('error', error);
      }
    })(); // return Query instance for chaining


    return this;
  }
  /**
   * Synonym of Query#execute()
   */


  /**
   * @private
   */
  async _execute(options) {
    const {
      headers,
      responseTarget,
      autoFetch,
      maxFetch,
      scanAll
    } = options;
    let url = '';

    if (this._locator) {
      url = [this._conn._baseUrl(), '/query/', this._locator].join('');
    } else {
      const soql = await this.toSOQL();
      this.totalFetched = 0;

      this._logger.debug(`SOQL = ${soql}`);

      url = [this._conn._baseUrl(), '/', scanAll ? 'queryAll' : 'query', '?q=', encodeURIComponent(soql)].join('');
    }

    const data = await this._conn.request({
      method: 'GET',
      url,
      headers
    });
    this.emit('fetch');
    this.totalSize = data.totalSize;
    let res;

    switch (responseTarget) {
      case ResponseTargets.SingleRecord:
        res = data.records && data.records.length > 0 ? data.records[0] : null;
        break;

      case ResponseTargets.Records:
        res = data.records;
        break;

      case ResponseTargets.Count:
        res = data.totalSize;
        break;

      default:
        res = data;
    } // only fire response event when it should be notified per fetch


    if (responseTarget !== ResponseTargets.Records) {
      this.emit('response', res, this);
    } // streaming record instances


    const numRecords = data.records && data.records.length || 0;
    let totalFetched = this.totalFetched || 0;

    for (let i = 0; i < numRecords; i++) {
      if (totalFetched >= maxFetch) {
        this._finished = true;
        break;
      }

      const record = data.records[i];
      this.emit('record', record, totalFetched, this);
      totalFetched += 1;
    }

    this.totalFetched = totalFetched;

    if (data.nextRecordsUrl) {
      this._locator = data.nextRecordsUrl.split('/').pop();
    }

    this._finished = this._finished || data.done || !autoFetch;

    if (this._finished) {
      this.emit('end');
    } else {
      this._execute(options);
    }

    return res;
  }
  /**
   * Obtain readable stream instance
   */


  stream(type = 'csv') {
    if (!this._finished && !this._executed) {
      this.execute({
        autoFetch: true
      });
    }

    return type === 'record' ? this._stream : this._stream.stream(type);
  }
  /**
   * Pipe the queried records to another stream
   * This is for backward compatibility; Query is not a record stream instance anymore in 2.0.
   * If you want a record stream instance, use `Query#stream('record')`.
   */


  pipe(stream) {
    return this.stream('record').pipe(stream);
  }
  /**
   * @protected
   */


  async _expandFields(sobject_) {
    var _context7, _context8, _context9;

    if (this._soql) {
      throw new Error('Cannot expand fields for the query which has already built SOQL.');
    }

    const {
      fields = [],
      table = ''
    } = this._config;
    const sobject = sobject_ || table;

    this._logger.debug(`_expandFields: sobject = ${sobject}, fields = ${fields.join(', ')}`);

    const [efields] = await _promise.default.all([this._expandAsteriskFields(sobject, fields), ...(0, _map.default)(_context7 = this._children).call(_context7, async childQuery => {
      await childQuery._expandFields();
      return [];
    })]);
    this._config.fields = efields;
    this._config.includes = (0, _reduce.default)(_context8 = (0, _map.default)(_context9 = this._children).call(_context9, cquery => {
      const cconfig = cquery._query._config;
      return [cconfig.table, cconfig];
    })).call(_context8, (includes, [ctable, cconfig]) => _objectSpread(_objectSpread({}, includes), {}, {
      [ctable]: cconfig
    }), {});
  }
  /**
   *
   */


  async _findRelationObject(relName) {
    const table = this._config.table;

    if (!table) {
      throw new Error('No table information provided in the query');
    }

    this._logger.debug(`finding table for relation "${relName}" in "${table}"...`);

    const sobject = await this._conn.describe$(table);
    const upperRname = relName.toUpperCase();

    for (const cr of sobject.childRelationships) {
      if ((cr.relationshipName || '').toUpperCase() === upperRname && cr.childSObject) {
        return cr.childSObject;
      }
    }

    throw new Error(`No child relationship found: ${relName}`);
  }
  /**
   *
   */


  async _expandAsteriskFields(sobject, fields) {
    const expandedFields = await _promise.default.all((0, _map.default)(fields).call(fields, async field => this._expandAsteriskField(sobject, field)));
    return (0, _reduce.default)(expandedFields).call(expandedFields, (eflds, flds) => [...eflds, ...flds], []);
  }
  /**
   *
   */


  async _expandAsteriskField(sobject, field) {
    this._logger.debug(`expanding field "${field}" in "${sobject}"...`);

    const fpath = field.split('.');

    if (fpath[fpath.length - 1] === '*') {
      var _context10;

      const so = await this._conn.describe$(sobject);

      this._logger.debug(`table ${sobject} has been described`);

      if (fpath.length > 1) {
        const rname = fpath.shift();

        for (const f of so.fields) {
          if (f.relationshipName && rname && f.relationshipName.toUpperCase() === rname.toUpperCase()) {
            const rfield = f;
            const referenceTo = rfield.referenceTo || [];
            const rtable = referenceTo.length === 1 ? referenceTo[0] : 'Name';
            const fpaths = await this._expandAsteriskField(rtable, fpath.join('.'));
            return (0, _map.default)(fpaths).call(fpaths, fp => `${rname}.${fp}`);
          }
        }

        return [];
      }

      return (0, _map.default)(_context10 = so.fields).call(_context10, f => f.name);
    }

    return [field];
  }
  /**
   * Explain plan for executing query
   */


  async explain() {
    const soql = await this.toSOQL();

    this._logger.debug(`SOQL = ${soql}`);

    const url = `/query/?explain=${encodeURIComponent(soql)}`;
    return this._conn.request(url);
  }
  /**
   * Return SOQL expression for the query
   */


  async toSOQL() {
    if (this._soql) {
      return this._soql;
    }

    await this._expandFields();
    return (0, _soqlBuilder.createSOQL)(this._config);
  }
  /**
   * Promise/A+ interface
   * http://promises-aplus.github.io/promises-spec/
   *
   * Delegate to deferred promise, return promise instance for query result
   */


  then(onResolve, onReject) {
    this._chaining = true;

    if (!this._finished && !this._executed) {
      this.execute();
    }

    if (!this._promise) {
      throw new Error('invalid state: promise is not set after query execution');
    }

    return this._promise.then(onResolve, onReject);
  }

  catch(onReject) {
    return this.then(null, onReject);
  }

  promise() {
    return _promise.default.resolve(this);
  }
  /**
   * Bulk delete queried records
   */


  destroy(type, options) {
    if (typeof type === 'object' && type !== null) {
      options = type;
      type = undefined;
    }

    options = options || {};
    const type_ = type || this._config.table;

    if (!type_) {
      throw new Error('SOQL based query needs SObject type information to bulk delete.');
    } // Set the threshold number to pass to bulk API


    const thresholdNum = options.allowBulk === false ? -1 : typeof options.bulkThreshold === 'number' ? options.bulkThreshold : // determine threshold if the connection version supports SObject collection API or not
    this._conn._ensureVersion(42) ? DEFAULT_BULK_THRESHOLD : this._conn._maxRequest / 2;
    return new _promise.default((resolve, reject) => {
      const createBatch = () => this._conn.sobject(type_).deleteBulk().on('response', resolve).on('error', reject);

      let records = [];
      let batch = null;

      const handleRecord = rec => {
        if (!rec.Id) {
          const err = new Error('Queried record does not include Salesforce record ID.');
          this.emit('error', err);
          return;
        }

        const record = {
          Id: rec.Id
        };

        if (batch) {
          batch.write(record);
        } else {
          records.push(record);

          if (thresholdNum >= 0 && records.length > thresholdNum) {
            // Use bulk delete instead of SObject REST API
            batch = createBatch();

            for (const record of records) {
              batch.write(record);
            }

            records = [];
          }
        }
      };

      const handleEnd = () => {
        if (batch) {
          batch.end();
        } else {
          const ids = (0, _map.default)(records).call(records, record => record.Id);

          this._conn.sobject(type_).destroy(ids, {
            allowRecursive: true
          }).then(resolve, reject);
        }
      };

      this.stream('record').on('data', handleRecord).on('end', handleEnd).on('error', reject);
    });
  }
  /**
   * Synonym of Query#destroy()
   */


  update(mapping, type, options) {
    if (typeof type === 'object' && type !== null) {
      options = type;
      type = undefined;
    }

    options = options || {};
    const type_ = type || this._config && this._config.table;

    if (!type_) {
      throw new Error('SOQL based query needs SObject type information to bulk update.');
    }

    const updateStream = typeof mapping === 'function' ? (0, _map.default)(_recordStream.default).call(_recordStream.default, mapping) : _recordStream.default.recordMapStream(mapping); // Set the threshold number to pass to bulk API

    const thresholdNum = options.allowBulk === false ? -1 : typeof options.bulkThreshold === 'number' ? options.bulkThreshold : // determine threshold if the connection version supports SObject collection API or not
    this._conn._ensureVersion(42) ? DEFAULT_BULK_THRESHOLD : this._conn._maxRequest / 2;
    return new _promise.default((resolve, reject) => {
      const createBatch = () => this._conn.sobject(type_).updateBulk().on('response', resolve).on('error', reject);

      let records = [];
      let batch = null;

      const handleRecord = record => {
        if (batch) {
          batch.write(record);
        } else {
          records.push(record);
        }

        if (thresholdNum >= 0 && records.length > thresholdNum) {
          // Use bulk update instead of SObject REST API
          batch = createBatch();

          for (const record of records) {
            batch.write(record);
          }

          records = [];
        }
      };

      const handleEnd = () => {
        if (batch) {
          batch.end();
        } else {
          this._conn.sobject(type_).update(records, {
            allowRecursive: true
          }).then(resolve, reject);
        }
      };

      this.stream('record').on('error', reject).pipe(updateStream).on('data', handleRecord).on('end', handleEnd).on('error', reject);
    });
  }

}
/*--------------------------------------------*/

/**
 * SubQuery object for representing child relationship query
 */


exports.Query = Query;
(0, _defineProperty2.default)(Query, "_logger", (0, _logger.getLogger)('query'));

class SubQuery {
  /**
   *
   */
  constructor(conn, relName, config, parent) {
    (0, _defineProperty2.default)(this, "_relName", void 0);
    (0, _defineProperty2.default)(this, "_query", void 0);
    (0, _defineProperty2.default)(this, "_parent", void 0);
    (0, _defineProperty2.default)(this, "offset", this.skip);
    (0, _defineProperty2.default)(this, "orderby", (0, _sort.default)(this));
    this._relName = relName;
    this._query = new Query(conn, config);
    this._parent = parent;
  }
  /**
   *
   */


  select(fields) {
    // force convert query record type without changing instance
    this._query = this._query.select(fields);
    return this;
  }
  /**
   *
   */


  where(conditions) {
    this._query = this._query.where(conditions);
    return this;
  }
  /**
   * Limit the returning result
   */


  limit(limit) {
    this._query = this._query.limit(limit);
    return this;
  }
  /**
   * Skip records
   */


  skip(offset) {
    this._query = this._query.skip(offset);
    return this;
  }
  /**
   * Synonym of SubQuery#skip()
   */


  sort(sort, dir) {
    var _context11;

    this._query = (0, _sort.default)(_context11 = this._query).call(_context11, sort, dir);
    return this;
  }
  /**
   * Synonym of SubQuery#sort()
   */


  /**
   *
   */
  async _expandFields() {
    const sobject = await this._parent._findRelationObject(this._relName);
    return this._query._expandFields(sobject);
  }
  /**
   * Back the context to parent query object
   */


  end() {
    return this._parent;
  }

}

exports.SubQuery = SubQuery;
var _default = Query;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9xdWVyeS50cyJdLCJuYW1lcyI6WyJSZXNwb25zZVRhcmdldFZhbHVlcyIsIlJlc3BvbnNlVGFyZ2V0cyIsInZhbHVlcyIsInRhcmdldCIsIkRFRkFVTFRfQlVMS19USFJFU0hPTEQiLCJRdWVyeSIsIkV2ZW50RW1pdHRlciIsImNvbnN0cnVjdG9yIiwiY29ubiIsImNvbmZpZyIsIm9wdGlvbnMiLCJza2lwIiwiZXhlY3V0ZSIsImRlc3Ryb3kiLCJfY29ubiIsIl9sb2dnZXIiLCJfbG9nTGV2ZWwiLCJjcmVhdGVJbnN0YW5jZSIsIl9zb3FsIiwibG9jYXRvciIsIl9sb2NhdG9yIiwic3BsaXQiLCJwb3AiLCJmaWVsZHMiLCJpbmNsdWRlcyIsInNvcnQiLCJfY29uZmlnIiwic2VsZWN0IiwiaW5jbHVkZUNoaWxkcmVuIiwiX29wdGlvbnMiLCJoZWFkZXJzIiwibWF4RmV0Y2giLCJhdXRvRmV0Y2giLCJzY2FuQWxsIiwicmVzcG9uc2VUYXJnZXQiLCJfcHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJvbiIsIl9zdHJlYW0iLCJTZXJpYWxpemFibGUiLCJyZWNvcmQiLCJwdXNoIiwiZXJyIiwiZW1pdCIsImUiLCJFcnJvciIsInRvRmllbGRBcnJheSIsImZzIiwiZiIsInYiLCJwIiwid2hlcmUiLCJjb25kaXRpb25zIiwibGltaXQiLCJvZmZzZXQiLCJkaXIiLCJpbmNsdWRlIiwiY2hpbGRSZWxOYW1lIiwiY2hpbGRDb25maWciLCJ1bmRlZmluZWQiLCJ0YWJsZSIsImNoaWxkUXVlcnkiLCJTdWJRdWVyeSIsIl9jaGlsZHJlbiIsImNybmFtZSIsInNldFJlc3BvbnNlVGFyZ2V0Iiwib3B0aW9uc18iLCJfZXhlY3V0ZWQiLCJfZmluaXNoZWQiLCJvbmNlIiwiUmVjb3JkcyIsIl9jaGFpbmluZyIsImRlYnVnIiwicmVjb3JkcyIsIm9uUmVjb3JkIiwicmVtb3ZlTGlzdGVuZXIiLCJfZXhlY3V0ZSIsImVycm9yIiwidXJsIiwiX2Jhc2VVcmwiLCJqb2luIiwic29xbCIsInRvU09RTCIsInRvdGFsRmV0Y2hlZCIsImVuY29kZVVSSUNvbXBvbmVudCIsImRhdGEiLCJyZXF1ZXN0IiwibWV0aG9kIiwidG90YWxTaXplIiwicmVzIiwiU2luZ2xlUmVjb3JkIiwibGVuZ3RoIiwiQ291bnQiLCJudW1SZWNvcmRzIiwiaSIsIm5leHRSZWNvcmRzVXJsIiwiZG9uZSIsInN0cmVhbSIsInR5cGUiLCJwaXBlIiwiX2V4cGFuZEZpZWxkcyIsInNvYmplY3RfIiwic29iamVjdCIsImVmaWVsZHMiLCJhbGwiLCJfZXhwYW5kQXN0ZXJpc2tGaWVsZHMiLCJjcXVlcnkiLCJjY29uZmlnIiwiX3F1ZXJ5IiwiY3RhYmxlIiwiX2ZpbmRSZWxhdGlvbk9iamVjdCIsInJlbE5hbWUiLCJkZXNjcmliZSQiLCJ1cHBlclJuYW1lIiwidG9VcHBlckNhc2UiLCJjciIsImNoaWxkUmVsYXRpb25zaGlwcyIsInJlbGF0aW9uc2hpcE5hbWUiLCJjaGlsZFNPYmplY3QiLCJleHBhbmRlZEZpZWxkcyIsImZpZWxkIiwiX2V4cGFuZEFzdGVyaXNrRmllbGQiLCJlZmxkcyIsImZsZHMiLCJmcGF0aCIsInNvIiwicm5hbWUiLCJzaGlmdCIsInJmaWVsZCIsInJlZmVyZW5jZVRvIiwicnRhYmxlIiwiZnBhdGhzIiwiZnAiLCJuYW1lIiwiZXhwbGFpbiIsInRoZW4iLCJvblJlc29sdmUiLCJvblJlamVjdCIsImNhdGNoIiwicHJvbWlzZSIsInR5cGVfIiwidGhyZXNob2xkTnVtIiwiYWxsb3dCdWxrIiwiYnVsa1RocmVzaG9sZCIsIl9lbnN1cmVWZXJzaW9uIiwiX21heFJlcXVlc3QiLCJjcmVhdGVCYXRjaCIsImRlbGV0ZUJ1bGsiLCJiYXRjaCIsImhhbmRsZVJlY29yZCIsInJlYyIsIklkIiwid3JpdGUiLCJoYW5kbGVFbmQiLCJlbmQiLCJpZHMiLCJhbGxvd1JlY3Vyc2l2ZSIsInVwZGF0ZSIsIm1hcHBpbmciLCJ1cGRhdGVTdHJlYW0iLCJSZWNvcmRTdHJlYW0iLCJyZWNvcmRNYXBTdHJl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SyxDQUFDQyxVQUFELEVBQW1EO0FBQ3RELFNBQUt3RCxNQUFMLEdBQWMsS0FBS0EsTUFBTCxDQUFZekQsS0FBWixDQUFrQkMsVUFBbEIsQ0FBZDtBQUNBLFdBQU8sSUFBUDtBQUNEO0FBRUQ7QUFDRjtBQUNBOzs7QUFDRUMsRUFBQUEsS0FBSyxDQUFDQSxLQUFELEVBQWdCO0FBQ25CLFNBQUt1RCxNQUFMLEdBQWMsS0FBS0EsTUFBTCxDQUFZdkQsS0FBWixDQUFrQkEsS0FBbEIsQ0FBZDtBQUNBLFdBQU8sSUFBUDtBQUNEO0FBRUQ7QUFDRjtBQUNBOzs7QUFDRTNDLEVBQUFBLElBQUksQ0FBQzRDLE1BQUQsRUFBaUI7QUFDbkIsU0FBS3NELE1BQUwsR0FBYyxLQUFLQSxNQUFMLENBQVlsRyxJQUFaLENBQWlCNEMsTUFBakIsQ0FBZDtBQUNBLFdBQU8sSUFBUDtBQUNEO0FBRUQ7QUFDRjtBQUNBOzs7QUFVRTlCLEVBQUFBLElBQUksQ0FDRkEsSUFERSxFQUVGK0IsR0FGRSxFQUdGO0FBQUE7O0FBQ0EsU0FBS3FELE1BQUwsR0FBYyxxQ0FBS0EsTUFBTCxtQkFBaUJwRixJQUFqQixFQUE4QitCLEdBQTlCLENBQWQ7QUFDQSxXQUFPLElBQVA7QUFDRDtBQUVEO0FBQ0Y7QUFDQTs7O0FBR0U7QUFDRjtBQUNBO0FBQ0UsUUFBTTZDLGFBQU4sR0FBc0I7QUFDcEIsVUFBTUUsT0FBTyxHQUFHLE1BQU0sS0FBSytELE9BQUwsQ0FBYXZELG1CQUFiLENBQWlDLEtBQUtzRCxRQUF0QyxDQUF0QjtBQUNBLFdBQU8sS0FBS3hELE1BQUwsQ0FBWVIsYUFBWixDQUEwQkUsT0FBMUIsQ0FBUDtBQUNEO0FBRUQ7QUFDRjtBQUNBOzs7QUFDRW9ELEVBQUFBLEdBQUcsR0FNMEI7QUFDM0IsV0FBUSxLQUFLVyxPQUFiO0FBQ0Q7O0FBOUdEOzs7ZUFpSGFqSyxLIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBNYW5hZ2VzIHF1ZXJ5IGZvciByZWNvcmRzIGluIFNhbGVzZm9yY2VcbiAqIEBhdXRob3IgU2hpbmljaGkgVG9taXRhIDxzaGluaWNoaS50b21pdGFAZ21haWwuY29tPlxuICovXG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IHsgTG9nZ2VyLCBnZXRMb2dnZXIgfSBmcm9tICcuL3V0aWwvbG9nZ2VyJztcbmltcG9ydCBSZWNvcmRTdHJlYW0sIHsgU2VyaWFsaXphYmxlIH0gZnJvbSAnLi9yZWNvcmQtc3RyZWFtJztcbmltcG9ydCBDb25uZWN0aW9uIGZyb20gJy4vY29ubmVjdGlvbic7XG5pbXBvcnQgeyBjcmVhdGVTT1FMIH0gZnJvbSAnLi9zb3FsLWJ1aWxkZXInO1xuaW1wb3J0IHsgUXVlcnlDb25maWcgYXMgU09RTFF1ZXJ5Q29uZmlnLCBTb3J0RGlyIH0gZnJvbSAnLi9zb3FsLWJ1aWxkZXInO1xuaW1wb3J0IHtcbiAgUmVjb3JkLFxuICBPcHRpb25hbCxcbiAgU2NoZW1hLFxuICBTT2JqZWN0TmFtZXMsXG4gIENoaWxkUmVsYXRpb25zaGlwTmFtZXMsXG4gIENoaWxkUmVsYXRpb25zaGlwU09iamVjdE5hbWUsXG4gIEZpZWxkUHJvamVjdGlvbkNvbmZpZyxcbiAgRmllbGRQYXRoU3BlY2lmaWVyLFxuICBGaWVsZFBhdGhTY29wZWRQcm9qZWN0aW9uLFxuICBTT2JqZWN0UmVjb3JkLFxuICBTT2JqZWN0SW5wdXRSZWNvcmQsXG4gIFNPYmplY3RVcGRhdGVSZWNvcmQsXG4gIFNhdmVSZXN1bHQsXG4gIERhdGVTdHJpbmcsXG4gIFNPYmplY3RDaGlsZFJlbGF0aW9uc2hpcFByb3AsXG4gIFNPYmplY3RGaWVsZE5hbWVzLFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFJlYWRhYmxlIH0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCBTZkRhdGUgZnJvbSAnLi9kYXRlJztcblxuLyoqXG4gKlxuICovXG5leHBvcnQgdHlwZSBRdWVyeUZpZWxkPFxuICBTIGV4dGVuZHMgU2NoZW1hLFxuICBOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+LFxuICBGUCBleHRlbmRzIEZpZWxkUGF0aFNwZWNpZmllcjxTLCBOPiA9IEZpZWxkUGF0aFNwZWNpZmllcjxTLCBOPlxuPiA9IEZQIHwgRlBbXSB8IHN0cmluZyB8IHN0cmluZ1tdIHwgeyBbZmllbGQ6IHN0cmluZ106IG51bWJlciB8IGJvb2xlYW4gfTtcblxuLyoqXG4gKlxuICovXG50eXBlIENWYWx1ZTxUPiA9IFQgZXh0ZW5kcyBEYXRlU3RyaW5nXG4gID8gU2ZEYXRlXG4gIDogVCBleHRlbmRzIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW5cbiAgPyBUXG4gIDogbmV2ZXI7XG5cbnR5cGUgQ29uZE9wPFQ+ID1cbiAgfCBbJyRlcScsIENWYWx1ZTxUPiB8IG51bGxdXG4gIHwgWyckbmUnLCBDVmFsdWU8VD4gfCBudWxsXVxuICB8IFsnJGd0JywgQ1ZhbHVlPFQ+XVxuICB8IFsnJGd0ZScsIENWYWx1ZTxUPl1cbiAgfCBbJyRsdCcsIENWYWx1ZTxUPl1cbiAgfCBbJyRsdGUnLCBDVmFsdWU8VD5dXG4gIHwgWyckbGlrZScsIFQgZXh0ZW5kcyBzdHJpbmcgPyBUIDogbmV2ZXJdXG4gIHwgWyckbmxpa2UnLCBUIGV4dGVuZHMgc3RyaW5nID8gVCA6IG5ldmVyXVxuICB8IFsnJGluJywgQXJyYXk8Q1ZhbHVlPFQ+Pl1cbiAgfCBbJyRuaW4nLCBBcnJheTxDVmFsdWU8VD4+XVxuICB8IFsnJGluY2x1ZGVzJywgVCBleHRlbmRzIHN0cmluZyA/IFRbXSA6IG5ldmVyXVxuICB8IFsnJGV4Y2x1ZGVzJywgVCBleHRlbmRzIHN0cmluZyA/IFRbXSA6IG5ldmVyXVxuICB8IFsnJGV4aXN0cycsIGJvb2xlYW5dO1xuXG50eXBlIENvbmRWYWx1ZU9iajxULCBPcCA9IENvbmRPcDxUPlswXT4gPSBPcCBleHRlbmRzIENvbmRPcDxUPlswXVxuICA/IE9wIGV4dGVuZHMgc3RyaW5nXG4gICAgPyB7IFtLIGluIE9wXTogRXh0cmFjdDxDb25kT3A8VD4sIFtPcCwgYW55XT5bMV0gfVxuICAgIDogbmV2ZXJcbiAgOiBuZXZlcjtcblxudHlwZSBDb25kVmFsdWU8VD4gPSBDVmFsdWU8VD4gfCBBcnJheTxDVmFsdWU8VD4+IHwgbnVsbCB8IENvbmRWYWx1ZU9iajxUPjtcblxudHlwZSBDb25kaXRpb25TZXQ8UiBleHRlbmRzIFJlY29yZD4gPSB7XG4gIFtLIGluIGtleW9mIFJdPzogQ29uZFZhbHVlPFJbS10+O1xufTtcblxuZXhwb3J0IHR5cGUgUXVlcnlDb25kaXRpb248UyBleHRlbmRzIFNjaGVtYSwgTiBleHRlbmRzIFNPYmplY3ROYW1lczxTPj4gPVxuICB8IHtcbiAgICAgICRvcjogUXVlcnlDb25kaXRpb248UywgTj5bXTtcbiAgICB9XG4gIHwge1xuICAgICAgJGFuZDogUXVlcnlDb25kaXRpb248UywgTj5bXTtcbiAgICB9XG4gIHwgQ29uZGl0aW9uU2V0PFNPYmplY3RSZWNvcmQ8UywgTj4+O1xuXG5leHBvcnQgdHlwZSBRdWVyeVNvcnQ8XG4gIFMgZXh0ZW5kcyBTY2hlbWEsXG4gIE4gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4sXG4gIFIgZXh0ZW5kcyBTT2JqZWN0UmVjb3JkPFMsIE4+ID0gU09iamVjdFJlY29yZDxTLCBOPlxuPiA9XG4gIHwge1xuICAgICAgW0sgaW4ga2V5b2YgUl0/OiBTb3J0RGlyO1xuICAgIH1cbiAgfCBBcnJheTxba2V5b2YgUiwgU29ydERpcl0+O1xuXG4vKipcbiAqXG4gKi9cbmV4cG9ydCB0eXBlIFF1ZXJ5Q29uZmlnPFxuICBTIGV4dGVuZHMgU2NoZW1hLFxuICBOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+LFxuICBGUCBleHRlbmRzIEZpZWxkUGF0aFNwZWNpZmllcjxTLCBOPiA9IEZpZWxkUGF0aFNwZWNpZmllcjxTLCBOPlxuPiA9IHtcbiAgZmllbGRzPzogUXVlcnlGaWVsZDxTLCBOLCBGUD47XG4gIGluY2x1ZGVzPzoge1xuICAgIFtDUk4gaW4gQ2hpbGRSZWxhdGlvbnNoaXBOYW1lczxTLCBOPl0/OiBRdWVyeUNvbmZpZzxcbiAgICAgIFMsXG4gICAgICBDaGlsZFJlbGF0aW9uc2hpcFNPYmplY3ROYW1lPFMsIE4sIENSTj5cbiAgICA+O1xuICB9O1xuICB0YWJsZT86IHN0cmluZztcbiAgY29uZGl0aW9ucz86IFF1ZXJ5Q29uZGl0aW9uPFMsIE4+O1xuICBzb3J0PzogUXVlcnlTb3J0PFMsIE4+O1xuICBsaW1pdD86IG51bWJlcjtcbiAgb2Zmc2V0PzogbnVtYmVyO1xufTtcblxuZXhwb3J0IHR5cGUgUXVlcnlPcHRpb25zID0ge1xuICBoZWFkZXJzOiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgbWF4RmV0Y2g6IG51bWJlcjtcbiAgYXV0b0ZldGNoOiBib29sZWFuO1xuICBzY2FuQWxsOiBib29sZWFuO1xuICByZXNwb25zZVRhcmdldDogUXVlcnlSZXNwb25zZVRhcmdldDtcbn07XG5cbmV4cG9ydCB0eXBlIFF1ZXJ5UmVzdWx0PFIgZXh0ZW5kcyBSZWNvcmQ+ID0ge1xuICBkb25lOiBib29sZWFuO1xuICB0b3RhbFNpemU6IG51bWJlcjtcbiAgcmVjb3JkczogUltdO1xuICBuZXh0UmVjb3Jkc1VybD86IHN0cmluZztcbn07XG5cbmV4cG9ydCB0eXBlIFF1ZXJ5RXhwbGFpblJlc3VsdCA9IHtcbiAgcGxhbnM6IEFycmF5PHtcbiAgICBjYXJkaW5hbGl0eTogbnVtYmVyO1xuICAgIGZpZWxkczogc3RyaW5nW107XG4gICAgbGVhZGluZ09wZXJhdGlvblR5cGU6ICdJbmRleCcgfCAnT3RoZXInIHwgJ1NoYXJpbmcnIHwgJ1RhYmxlU2Nhbic7XG4gICAgbm90ZXM6IEFycmF5PHtcbiAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgICBmaWVsZHM6IHN0cmluZ1tdO1xuICAgICAgdGFibGVFbnVtT3JJZDogc3RyaW5nO1xuICAgIH0+O1xuICAgIHJlbGF0aXZlQ29zdDogbnVtYmVyO1xuICAgIHNvYmplY3RDYXJkaW5hbGl0eTogbnVtYmVyO1xuICAgIHNvYmplY3RUeXBlOiBzdHJpbmc7XG4gIH0+O1xufTtcblxuY29uc3QgUmVzcG9uc2VUYXJnZXRWYWx1ZXMgPSBbXG4gICdRdWVyeVJlc3VsdCcsXG4gICdSZWNvcmRzJyxcbiAgJ1NpbmdsZVJlY29yZCcsXG4gICdDb3VudCcsXG5dIGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBRdWVyeVJlc3BvbnNlVGFyZ2V0ID0gdHlwZW9mIFJlc3BvbnNlVGFyZ2V0VmFsdWVzW251bWJlcl07XG5cbmV4cG9ydCBjb25zdCBSZXNwb25zZVRhcmdldHM6IHtcbiAgW0sgaW4gUXVlcnlSZXNwb25zZVRhcmdldF06IEs7XG59ID0gUmVzcG9uc2VUYXJnZXRWYWx1ZXMucmVkdWNlKFxuICAodmFsdWVzLCB0YXJnZXQpID0+ICh7IC4uLnZhbHVlcywgW3RhcmdldF06IHRhcmdldCB9KSxcbiAge30gYXMge1xuICAgIFtLIGluIFF1ZXJ5UmVzcG9uc2VUYXJnZXRdOiBLO1xuICB9LFxuKTtcblxuZXhwb3J0IHR5cGUgUXVlcnlSZXNwb25zZTxcbiAgUiBleHRlbmRzIFJlY29yZCxcbiAgUVJUIGV4dGVuZHMgUXVlcnlSZXNwb25zZVRhcmdldCA9IFF1ZXJ5UmVzcG9uc2VUYXJnZXRcbj4gPSBRUlQgZXh0ZW5kcyAnUXVlcnlSZXN1bHQnXG4gID8gUXVlcnlSZXN1bHQ8Uj5cbiAgOiBRUlQgZXh0ZW5kcyAnUmVjb3JkcydcbiAgPyBSW11cbiAgOiBRUlQgZXh0ZW5kcyAnU2luZ2xlUmVjb3JkJ1xuICA/IFIgfCBudWxsXG4gIDogbnVtYmVyOyAvLyBRUlQgZXh0ZW5kcyAnQ291bnQnXG5cbmV4cG9ydCB0eXBlIFF1ZXJ5RGVzdHJveU9wdGlvbnMgPSB7XG4gIGFsbG93QnVsaz86IGJvb2xlYW47XG4gIGJ1bGtUaHJlc2hvbGQ/OiBudW1iZXI7XG59O1xuXG5leHBvcnQgdHlwZSBRdWVyeVVwZGF0ZU9wdGlvbnMgPSB7XG4gIGFsbG93QnVsaz86IGJvb2xlYW47XG4gIGJ1bGtUaHJlc2hvbGQ/OiBudW1iZXI7XG59O1xuXG4vKipcbiAqXG4gKi9cbmNvbnN0IERFRkFVTFRfQlVMS19USFJFU0hPTEQgPSAyMDA7XG5cbi8qKlxuICogUXVlcnlcbiAqL1xuZXhwb3J0IGNsYXNzIFF1ZXJ5PFxuICBTIGV4dGVuZHMgU2NoZW1hLFxuICBOIGV4dGVuZHMgU09iamVjdE5hbWVzPFM+LFxuICBSIGV4dGVuZHMgUmVjb3JkID0gUmVjb3JkLFxuICBRUlQgZXh0ZW5kcyBRdWVyeVJlc3BvbnNlVGFyZ2V0ID0gUXVlcnlSZXNwb25zZVRhcmdldFxuPiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIHN0YXRpYyBfbG9nZ2VyID0gZ2V0TG9nZ2VyKCdxdWVyeScpO1xuXG4gIF9jb25uOiBDb25uZWN0aW9uPFM+O1xuICBfbG9nZ2VyOiBMb2dnZXI7XG4gIF9zb3FsOiBPcHRpb25hbDxzdHJpbmc+O1xuICBfbG9jYXRvcjogT3B0aW9uYWw8c3RyaW5nPjtcbiAgX2NvbmZpZzogU09RTFF1ZXJ5Q29uZmlnID0ge307XG4gIF9jaGlsZHJlbjogU3ViUXVlcnk8UywgTiwgUiwgUVJULCBhbnksIGFueSwgYW55PltdID0gW107XG4gIF9vcHRpb25zOiBRdWVyeU9wdGlvbnM7XG4gIF9leGVjdXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuICBfZmluaXNoZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgX2NoYWluaW5nOiBib29sZWFuID0gZmFsc2U7XG4gIF9wcm9taXNlOiBQcm9taXNlPFF1ZXJ5UmVzcG9uc2U8UiwgUVJUPj47XG4gIF9zdHJlYW06IFNlcmlhbGl6YWJsZTxSPjtcblxuICB0b3RhbFNpemU6IE9wdGlvbmFsPG51bWJlcj47XG4gIHRvdGFsRmV0Y2hlZDogT3B0aW9uYWw8bnVtYmVyPjtcblxuICAvKipcbiAgICpcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIGNvbm46IENvbm5lY3Rpb248Uz4sXG4gICAgY29uZmlnOiBzdHJpbmcgfCBRdWVyeUNvbmZpZzxTLCBOPiB8IHsgbG9jYXRvcjogc3RyaW5nIH0sXG4gICAgb3B0aW9ucz86IFBhcnRpYWw8UXVlcnlPcHRpb25zPixcbiAgKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLl9jb25uID0gY29ubjtcbiAgICB0aGlzLl9sb2dnZXIgPSBjb25uLl9sb2dMZXZlbFxuICAgICAgPyBRdWVyeS5fbG9nZ2VyLmNyZWF0ZUluc3RhbmNlKGNvbm4uX2xvZ0xldmVsKVxuICAgICAgOiBRdWVyeS5fbG9nZ2VyO1xuICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5fc29xbCA9IGNvbmZpZztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiAoY29uZmlnIGFzIGFueSkubG9jYXRvciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IGxvY2F0b3I6IHN0cmluZyA9IChjb25maWcgYXMgYW55KS5sb2NhdG9yO1xuICAgICAgaWYgKGxvY2F0b3IuaW5kZXhPZignLycpID49IDApIHtcbiAgICAgICAgdGhpcy5fbG9jYXRvciA9IGxvY2F0b3Iuc3BsaXQoJy8nKS5wb3AoKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgeyBmaWVsZHMsIGluY2x1ZGVzLCBzb3J0LCAuLi5fY29uZmlnIH0gPSBjb25maWcgYXMgUXVlcnlDb25maWc8XG4gICAgICAgIFMsXG4gICAgICAgIE5cbiAgICAgID47XG4gICAgICB0aGlzLl9jb25maWcgPSBfY29uZmlnO1xuICAgICAgdGhpcy5zZWxlY3QoZmllbGRzKTtcbiAgICAgIGlmIChpbmNsdWRlcykge1xuICAgICAgICB0aGlzLmluY2x1ZGVDaGlsZHJlbihpbmNsdWRlcyk7XG4gICAgICB9XG4gICAgICBpZiAoc29ydCkge1xuICAgICAgICB0aGlzLnNvcnQoc29ydCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX29wdGlvbnMgPSB7XG4gICAgICBoZWFkZXJzOiB7fSxcbiAgICAgIG1heEZldGNoOiAxMDAwMCxcbiAgICAgIGF1dG9GZXRjaDogZmFsc2UsXG4gICAgICBzY2FuQWxsOiBmYWxzZSxcbiAgICAgIHJlc3BvbnNlVGFyZ2V0OiAnUXVlcnlSZXN1bHQnLFxuICAgICAgLi4uKG9wdGlvbnMgfHwge30pLFxuICAgIH0gYXMgUXVlcnlPcHRpb25zO1xuICAgIC8vIHByb21pc2UgaW5zdGFuY2VcbiAgICB0aGlzLl9wcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5vbigncmVzcG9uc2UnLCByZXNvbHZlKTtcbiAgICAgIHRoaXMub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICB9KTtcbiAgICB0aGlzLl9zdHJlYW0gPSBuZXcgU2VyaWFsaXphYmxlKCk7XG4gICAgdGhpcy5vbigncmVjb3JkJywgKHJlY29yZCkgPT4gdGhpcy5fc3RyZWFtLnB1c2gocmVjb3JkKSk7XG4gICAgdGhpcy5vbignZW5kJywgKCkgPT4gdGhpcy5fc3RyZWFtLnB1c2gobnVsbCkpO1xuICAgIHRoaXMub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5fc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbGVjdCBmaWVsZHMgdG8gaW5jbHVkZSBpbiB0aGUgcmV0dXJuaW5nIHJlc3VsdFxuICAgKi9cbiAgc2VsZWN0PFxuICAgIFIgZXh0ZW5kcyBSZWNvcmQgPSBSZWNvcmQsXG4gICAgRlAgZXh0ZW5kcyBGaWVsZFBhdGhTcGVjaWZpZXI8UywgTj4gPSBGaWVsZFBhdGhTcGVjaWZpZXI8UywgTj4sXG4gICAgRlBDIGV4dGVuZHMgRmllbGRQcm9qZWN0aW9uQ29uZmlnID0gRmllbGRQYXRoU2NvcGVkUHJvamVjdGlvbjxTLCBOLCBGUD4sXG4gICAgUjIgZXh0ZW5kcyBTT2JqZWN0UmVjb3JkPFMsIE4sIEZQQywgUj4gPSBTT2JqZWN0UmVjb3JkPFMsIE4sIEZQQywgUj5cbiAgPihmaWVsZHM6IFF1ZXJ5RmllbGQ8UywgTiwgRlA+ID0gJyonKTogUXVlcnk8UywgTiwgUjIsIFFSVD4ge1xuICAgIGlmICh0aGlzLl9zb3FsKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBzZXQgc2VsZWN0IGZpZWxkcyBmb3IgdGhlIHF1ZXJ5IHdoaWNoIGhhcyBhbHJlYWR5IGJ1aWx0IFNPUUwuJyxcbiAgICAgICk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHRvRmllbGRBcnJheShmaWVsZHM6IFF1ZXJ5RmllbGQ8UywgTiwgRlA+KTogc3RyaW5nW10ge1xuICAgICAgcmV0dXJuIHR5cGVvZiBmaWVsZHMgPT09ICdzdHJpbmcnXG4gICAgICAgID8gZmllbGRzLnNwbGl0KC9cXHMqLFxccyovKVxuICAgICAgICA6IEFycmF5LmlzQXJyYXkoZmllbGRzKVxuICAgICAgICA/IChmaWVsZHMgYXMgQXJyYXk8c3RyaW5nIHwgRlA+KVxuICAgICAgICAgICAgLm1hcCh0b0ZpZWxkQXJyYXkpXG4gICAgICAgICAgICAucmVkdWNlKChmcywgZikgPT4gWy4uLmZzLCAuLi5mXSwgW10gYXMgc3RyaW5nW10pXG4gICAgICAgIDogT2JqZWN0LmVudHJpZXMoZmllbGRzIGFzIHsgW25hbWU6IHN0cmluZ106IFF1ZXJ5RmllbGQ8UywgTiwgRlA+IH0pXG4gICAgICAgICAgICAubWFwKChbZiwgdl0pID0+IHtcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2ID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHYgPyBbZl0gOiBbXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9GaWVsZEFycmF5KHYpLm1hcCgocCkgPT4gYCR7Zn0uJHtwfWApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnJlZHVjZSgoZnMsIGYpID0+IFsuLi5mcywgLi4uZl0sIFtdIGFzIHN0cmluZ1tdKTtcbiAgICB9XG4gICAgaWYgKGZpZWxkcykge1xuICAgICAgdGhpcy5fY29uZmlnLmZpZWxkcyA9IHRvRmllbGRBcnJheShmaWVsZHMpO1xuICAgIH1cbiAgICAvLyBmb3JjZSBjb252ZXJ0IHF1ZXJ5IHJlY29yZCB0eXBlIHdpdGhvdXQgY2hhbmdpbmcgaW5zdGFuY2U7XG4gICAgcmV0dXJuICh0aGlzIGFzIGFueSkgYXMgUXVlcnk8UywgTiwgUjIsIFFSVD47XG4gIH1cblxuICAvKipcbiAgICogU2V0IHF1ZXJ5IGNvbmRpdGlvbnMgdG8gZmlsdGVyIHRoZSByZXN1bHQgcmVjb3Jkc1xuICAgKi9cbiAgd2hlcmUoY29uZGl0aW9uczogUXVlcnlDb25kaXRpb248UywgTj4gfCBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5fc29xbCkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICdDYW5ub3Qgc2V0IHdoZXJlIGNvbmRpdGlvbnMgZm9yIHRoZSBxdWVyeSB3aGljaCBoYXMgYWxyZWFkeSBidWlsdCBTT1FMLicsXG4gICAgICApO1xuICAgIH1cbiAgICB0aGlzLl9jb25maWcuY29uZGl0aW9ucyA9IGNvbmRpdGlvbnM7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogTGltaXQgdGhlIHJldHVybmluZyByZXN1bHRcbiAgICovXG4gIGxpbWl0KGxpbWl0OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5fc29xbCkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICdDYW5ub3Qgc2V0IGxpbWl0IGZvciB0aGUgcXVlcnkgd2hpY2ggaGFzIGFscmVhZHkgYnVpbHQgU09RTC4nLFxuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5fY29uZmlnLmxpbWl0ID0gbGltaXQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU2tpcCByZWNvcmRzXG4gICAqL1xuICBza2lwKG9mZnNldDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3NvcWwpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAnQ2Fubm90IHNldCBza2lwL29mZnNldCBmb3IgdGhlIHF1ZXJ5IHdoaWNoIGhhcyBhbHJlYWR5IGJ1aWx0IFNPUUwuJyxcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuX2NvbmZpZy5vZmZzZXQgPSBvZmZzZXQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU3lub255bSBvZiBRdWVyeSNza2lwKClcbiAgICovXG4gIG9mZnNldCA9IHRoaXMuc2tpcDtcblxuICAvKipcbiAgICogU2V0IHF1ZXJ5IHNvcnQgd2l0aCBkaXJlY3Rpb25cbiAgICovXG4gIHNvcnQoc29ydDogUXVlcnlTb3J0PFMsIE4+KTogdGhpcztcbiAgc29ydChzb3J0OiBzdHJpbmcpOiB0aGlzO1xuICBzb3J0KHNvcnQ6IFNPYmplY3RGaWVsZE5hbWVzPFMsIE4+LCBkaXI6IFNvcnREaXIpOiB0aGlzO1xuICBzb3J0KHNvcnQ6IHN0cmluZywgZGlyOiBTb3J0RGlyKTogdGhpcztcbiAgc29ydChcbiAgICBzb3J0OiBRdWVyeVNvcnQ8UywgTj4gfCBTT2JqZWN0RmllbGROYW1lczxTLCBOPiB8IHN0cmluZyxcbiAgICBkaXI/OiBTb3J0RGlyLFxuICApIHtcbiAgICBpZiAodGhpcy5fc29xbCkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICdDYW5ub3Qgc2V0IHNvcnQgZm9yIHRoZSBxdWVyeSB3aGljaCBoYXMgYWxyZWFkeSBidWlsdCBTT1FMLicsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHNvcnQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBkaXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLl9jb25maWcuc29ydCA9IFtbc29ydCwgZGlyXV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2NvbmZpZy5zb3J0ID0gc29ydCBhcyBzdHJpbmcgfCB7IFtmaWVsZDogc3RyaW5nXTogU29ydERpciB9O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTeW5vbnltIG9mIFF1ZXJ5I3NvcnQoKVxuICAgKi9cbiAgb3JkZXJieTogdHlwZW9mIFF1ZXJ5LnByb3RvdHlwZS5zb3J0ID0gdGhpcy5zb3J0O1xuXG4gIC8qKlxuICAgKiBJbmNsdWRlIGNoaWxkIHJlbGF0aW9uc2hpcCBxdWVyeSBhbmQgbW92ZSBkb3duIHRvIHRoZSBjaGlsZCBxdWVyeSBjb250ZXh0XG4gICAqL1xuICBpbmNsdWRlPFxuICAgIENSTiBleHRlbmRzIENoaWxkUmVsYXRpb25zaGlwTmFtZXM8UywgTj4sXG4gICAgQ04gZXh0ZW5kcyBDaGlsZFJlbGF0aW9uc2hpcFNPYmplY3ROYW1lPFMsIE4sIENSTj4sXG4gICAgQ0ZQIGV4dGVuZHMgRmllbGRQYXRoU3BlY2lmaWVyPFMsIENOPiA9IEZpZWxkUGF0aFNwZWNpZmllcjxTLCBDTj4sXG4gICAgQ0ZQQyBleHRlbmRzIEZpZWxkUHJvamVjdGlvbkNvbmZpZyA9IEZpZWxkUGF0aFNjb3BlZFByb2plY3Rpb248UywgQ04sIENGUD4sXG4gICAgQ1IgZXh0ZW5kcyBSZWNvcmQgPSBTT2JqZWN0UmVjb3JkPFMsIENOLCBDRlBDPlxuICA+KFxuICAgIGNoaWxkUmVsTmFtZTogQ1JOLFxuICAgIGNvbmRpdGlvbnM/OiBPcHRpb25hbDxRdWVyeUNvbmRpdGlvbjxTLCBDTj4+LFxuICAgIGZpZWxkcz86IE9wdGlvbmFsPFF1ZXJ5RmllbGQ8UywgQ04sIENGUD4+LFxuICAgIG9wdGlvbnM/OiB7IGxpbWl0PzogbnVtYmVyOyBvZmZzZXQ/OiBudW1iZXI7IHNvcnQ/OiBRdWVyeVNvcnQ8UywgQ04+IH0sXG4gICk6IFN1YlF1ZXJ5PFMsIE4sIFIsIFFSVCwgQ1JOLCBDTiwgQ1I+O1xuICBpbmNsdWRlPFxuICAgIENSTiBleHRlbmRzIENoaWxkUmVsYXRpb25zaGlwTmFtZXM8UywgTj4sXG4gICAgQ04gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4sXG4gICAgQ1IgZXh0ZW5kcyBSZWNvcmQgPSBTT2JqZWN0UmVjb3JkPFMsIENOPlxuICA+KFxuICAgIGNoaWxkUmVsTmFtZTogc3RyaW5nLFxuICAgIGNvbmRpdGlvbnM/OiBPcHRpb25hbDxRdWVyeUNvbmRpdGlvbjxTLCBDTj4+LFxuICAgIGZpZWxkcz86IE9wdGlvbmFsPFF1ZXJ5RmllbGQ8UywgQ04+PixcbiAgICBvcHRpb25zPzogeyBsaW1pdD86IG51bWJlcjsgb2Zmc2V0PzogbnVtYmVyOyBzb3J0PzogUXVlcnlTb3J0PFMsIENOPiB9LFxuICApOiBTdWJRdWVyeTxTLCBOLCBSLCBRUlQsIENSTiwgQ04sIENSPjtcblxuICBpbmNsdWRlPFxuICAgIENSTiBleHRlbmRzIENoaWxkUmVsYXRpb25zaGlwTmFtZXM8UywgTj4sXG4gICAgQ04gZXh0ZW5kcyBDaGlsZFJlbGF0aW9uc2hpcFNPYmplY3ROYW1lPFMsIE4sIENSTj4sXG4gICAgQ0ZQIGV4dGVuZHMgRmllbGRQYXRoU3BlY2lmaWVyPFMsIENOPiA9IEZpZWxkUGF0aFNwZWNpZmllcjxTLCBDTj4sXG4gICAgQ0ZQQyBleHRlbmRzIEZpZWxkUHJvamVjdGlvbkNvbmZpZyA9IEZpZWxkUGF0aFNjb3BlZFByb2plY3Rpb248UywgQ04sIENGUD4sXG4gICAgQ1IgZXh0ZW5kcyBSZWNvcmQgPSBTT2JqZWN0UmVjb3JkPFMsIENOLCBDRlBDPlxuICA+KFxuICAgIGNoaWxkUmVsTmFtZTogQ1JOIHwgc3RyaW5nLFxuICAgIGNvbmRpdGlvbnM/OiBPcHRpb25hbDxRdWVyeUNvbmRpdGlvbjxTLCBDTj4+LFxuICAgIGZpZWxkcz86IE9wdGlvbmFsPFF1ZXJ5RmllbGQ8UywgQ04sIENGUD4+LFxuICAgIG9wdGlvbnM6IHsgbGltaXQ/OiBudW1iZXI7IG9mZnNldD86IG51bWJlcjsgc29ydD86IFF1ZXJ5U29ydDxTLCBDTj4gfSA9IHt9LFxuICApOiBTdWJRdWVyeTxTLCBOLCBSLCBRUlQsIENSTiwgQ04sIENSPiB7XG4gICAgaWYgKHRoaXMuX3NvcWwpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAnQ2Fubm90IGluY2x1ZGUgY2hpbGQgcmVsYXRpb25zaGlwIGludG8gdGhlIHF1ZXJ5IHdoaWNoIGhhcyBhbHJlYWR5IGJ1aWx0IFNPUUwuJyxcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGNoaWxkQ29uZmlnOiBRdWVyeUNvbmZpZzxTLCBDTiwgQ0ZQPiA9IHtcbiAgICAgIGZpZWxkczogZmllbGRzID09PSBudWxsID8gdW5kZWZpbmVkIDogZmllbGRzLFxuICAgICAgdGFibGU6IGNoaWxkUmVsTmFtZSxcbiAgICAgIGNvbmRpdGlvbnM6IGNvbmRpdGlvbnMgPT09IG51bGwgPyB1bmRlZmluZWQgOiBjb25kaXRpb25zLFxuICAgICAgbGltaXQ6IG9wdGlvbnMubGltaXQsXG4gICAgICBvZmZzZXQ6IG9wdGlvbnMub2Zmc2V0LFxuICAgICAgc29ydDogb3B0aW9ucy5zb3J0LFxuICAgIH07XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVzZS1iZWZvcmUtZGVmaW5lXG4gICAgY29uc3QgY2hpbGRRdWVyeSA9IG5ldyBTdWJRdWVyeTxTLCBOLCBSLCBRUlQsIENSTiwgQ04sIENSPihcbiAgICAgIHRoaXMuX2Nvbm4sXG4gICAgICBjaGlsZFJlbE5hbWUgYXMgQ1JOLFxuICAgICAgY2hpbGRDb25maWcsXG4gICAgICB0aGlzLFxuICAgICk7XG4gICAgdGhpcy5fY2hpbGRyZW4ucHVzaChjaGlsZFF1ZXJ5KTtcbiAgICByZXR1cm4gY2hpbGRRdWVyeTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbmNsdWRlIGNoaWxkIHJlbGF0aW9uc2hpcCBxdWVyeWllcywgYnV0IG5vdCBtb3ZpbmcgZG93biB0byB0aGUgY2hpbGRyZW4gY29udGV4dFxuICAgKi9cbiAgaW5jbHVkZUNoaWxkcmVuKFxuICAgIGluY2x1ZGVzOiB7XG4gICAgICBbQ1JOIGluIENoaWxkUmVsYXRpb25zaGlwTmFtZXM8UywgTj5dPzogUXVlcnlDb25maWc8XG4gICAgICAgIFMsXG4gICAgICAgIENoaWxkUmVsYXRpb25zaGlwU09iamVjdE5hbWU8UywgTiwgQ1JOPlxuICAgICAgPjtcbiAgICB9LFxuICApIHtcbiAgICB0eXBlIENSTiA9IENoaWxkUmVsYXRpb25zaGlwTmFtZXM8UywgTj47XG4gICAgaWYgKHRoaXMuX3NvcWwpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAnQ2Fubm90IGluY2x1ZGUgY2hpbGQgcmVsYXRpb25zaGlwIGludG8gdGhlIHF1ZXJ5IHdoaWNoIGhhcyBhbHJlYWR5IGJ1aWx0IFNPUUwuJyxcbiAgICAgICk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY3JuYW1lIG9mIE9iamVjdC5rZXlzKGluY2x1ZGVzKSBhcyBDUk5bXSkge1xuICAgICAgY29uc3QgeyBjb25kaXRpb25zLCBmaWVsZHMsIC4uLm9wdGlvbnMgfSA9IGluY2x1ZGVzW1xuICAgICAgICBjcm5hbWVcbiAgICAgIF0gYXMgUXVlcnlDb25maWc8UywgQ2hpbGRSZWxhdGlvbnNoaXBTT2JqZWN0TmFtZTxTLCBOLCBDUk4+PjtcbiAgICAgIHRoaXMuaW5jbHVkZShjcm5hbWUsIGNvbmRpdGlvbnMsIGZpZWxkcywgb3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHRpbmcgbWF4RmV0Y2ggcXVlcnkgb3B0aW9uXG4gICAqL1xuICBtYXhGZXRjaChtYXhGZXRjaDogbnVtYmVyKSB7XG4gICAgdGhpcy5fb3B0aW9ucy5tYXhGZXRjaCA9IG1heEZldGNoO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFN3aXRjaGluZyBhdXRvIGZldGNoIG1vZGVcbiAgICovXG4gIGF1dG9GZXRjaChhdXRvRmV0Y2g6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9vcHRpb25zLmF1dG9GZXRjaCA9IGF1dG9GZXRjaDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgZmxhZyB0byBzY2FuIGFsbCByZWNvcmRzIGluY2x1ZGluZyBkZWxldGVkIGFuZCBhcmNoaXZlZC5cbiAgICovXG4gIHNjYW5BbGwoc2NhbkFsbDogYm9vbGVhbikge1xuICAgIHRoaXMuX29wdGlvbnMuc2NhbkFsbCA9IHNjYW5BbGw7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIHNldFJlc3BvbnNlVGFyZ2V0PFFSVDEgZXh0ZW5kcyBRdWVyeVJlc3BvbnNlVGFyZ2V0PihcbiAgICByZXNwb25zZVRhcmdldDogUVJUMSxcbiAgKTogUXVlcnk8UywgTiwgUiwgUVJUMT4ge1xuICAgIGlmIChyZXNwb25zZVRhcmdldCBpbiBSZXNwb25zZVRhcmdldHMpIHtcbiAgICAgIHRoaXMuX29wdGlvbnMucmVzcG9uc2VUYXJnZXQgPSByZXNwb25zZVRhcmdldDtcbiAgICB9XG4gICAgLy8gZm9yY2UgY2hhbmdlIHF1ZXJ5IHJlc3BvbnNlIHRhcmdldCB3aXRob3V0IGNoYW5naW5nIGluc3RhbmNlXG4gICAgcmV0dXJuICh0aGlzIGFzIFF1ZXJ5PFMsIE4sIFI+KSBhcyBRdWVyeTxTLCBOLCBSLCBRUlQxPjtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHF1ZXJ5IGFuZCBmZXRjaCByZWNvcmRzIGZyb20gc2VydmVyLlxuICAgKi9cbiAgZXhlY3V0ZTxRUlQxIGV4dGVuZHMgUXVlcnlSZXNwb25zZVRhcmdldCA9IFFSVD4oXG4gICAgb3B0aW9uc186IFBhcnRpYWw8UXVlcnlPcHRpb25zPiAmIHsgcmVzcG9uc2VUYXJnZXQ/OiBRUlQxIH0gPSB7fSxcbiAgKTogUXVlcnk8UywgTiwgUiwgUVJUMT4ge1xuICAgIGlmICh0aGlzLl9leGVjdXRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZS1leGVjdXRpbmcgYWxyZWFkeSBleGVjdXRlZCBxdWVyeScpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9maW5pc2hlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdleGVjdXRpbmcgYWxyZWFkeSBjbG9zZWQgcXVlcnknKTtcbiAgICB9XG5cbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgaGVhZGVyczogb3B0aW9uc18uaGVhZGVycyB8fCB0aGlzLl9vcHRpb25zLmhlYWRlcnMsXG4gICAgICByZXNwb25zZVRhcmdldDogb3B0aW9uc18ucmVzcG9uc2VUYXJnZXQgfHwgdGhpcy5fb3B0aW9ucy5yZXNwb25zZVRhcmdldCxcbiAgICAgIGF1dG9GZXRjaDogb3B0aW9uc18uYXV0b0ZldGNoIHx8IHRoaXMuX29wdGlvbnMuYXV0b0ZldGNoLFxuICAgICAgbWF4RmV0Y2g6IG9wdGlvbnNfLm1heEZldGNoIHx8IHRoaXMuX29wdGlvbnMubWF4RmV0Y2gsXG4gICAgICBzY2FuQWxsOiBvcHRpb25zXy5zY2FuQWxsIHx8IHRoaXMuX29wdGlvbnMuc2NhbkFsbCxcbiAgICB9O1xuXG4gICAgLy8gY29sbGVjdCBmZXRjaGVkIHJlY29yZHMgaW4gYXJyYXlcbiAgICAvLyBvbmx5IHdoZW4gcmVzcG9uc2UgdGFyZ2V0IGlzIFJlY29yZHMgYW5kXG4gICAgLy8gZWl0aGVyIGNhbGxiYWNrIG9yIGNoYWluaW5nIHByb21pc2VzIGFyZSBhdmFpbGFibGUgdG8gdGhpcyBxdWVyeS5cbiAgICB0aGlzLm9uY2UoJ2ZldGNoJywgKCkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICBvcHRpb25zLnJlc3BvbnNlVGFyZ2V0ID09PSBSZXNwb25zZVRhcmdldHMuUmVjb3JkcyAmJlxuICAgICAgICB0aGlzLl9jaGFpbmluZ1xuICAgICAgKSB7XG4gICAgICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZygnLS0tIGNvbGxlY3RpbmcgYWxsIGZldGNoZWQgcmVjb3JkcyAtLS0nKTtcbiAgICAgICAgY29uc3QgcmVjb3JkczogUmVjb3JkW10gPSBbXTtcbiAgICAgICAgY29uc3Qgb25SZWNvcmQgPSAocmVjb3JkOiBSZWNvcmQpID0+IHJlY29yZHMucHVzaChyZWNvcmQpO1xuICAgICAgICB0aGlzLm9uKCdyZWNvcmQnLCBvblJlY29yZCk7XG4gICAgICAgIHRoaXMub25jZSgnZW5kJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ3JlY29yZCcsIG9uUmVjb3JkKTtcbiAgICAgICAgICB0aGlzLmVtaXQoJ3Jlc3BvbnNlJywgcmVjb3JkcywgdGhpcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gZmxhZyB0byBwcmV2ZW50IHJlLWV4ZWN1dGlvblxuICAgIHRoaXMuX2V4ZWN1dGVkID0gdHJ1ZTtcblxuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAvLyBzdGFydCBhY3R1YWwgcXVlcnlcbiAgICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZygnPj4+IFF1ZXJ5IHN0YXJ0ID4+PicpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5fZXhlY3V0ZShvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fbG9nZ2VyLmRlYnVnKCcqKiogUXVlcnkgZmluaXNoZWQgKioqJyk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLl9sb2dnZXIuZGVidWcoJy0tLSBRdWVyeSBlcnJvciAtLS0nLCBlcnJvcik7XG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnJvcik7XG4gICAgICB9XG4gICAgfSkoKTtcblxuICAgIC8vIHJldHVybiBRdWVyeSBpbnN0YW5jZSBmb3IgY2hhaW5pbmdcbiAgICByZXR1cm4gKHRoaXMgYXMgUXVlcnk8UywgTiwgUj4pIGFzIFF1ZXJ5PFMsIE4sIFIsIFFSVDE+O1xuICB9XG5cbiAgLyoqXG4gICAqIFN5bm9ueW0gb2YgUXVlcnkjZXhlY3V0ZSgpXG4gICAqL1xuICBleGVjID0gdGhpcy5leGVjdXRlO1xuXG4gIC8qKlxuICAgKiBTeW5vbnltIG9mIFF1ZXJ5I2V4ZWN1dGUoKVxuICAgKi9cbiAgcnVuID0gdGhpcy5leGVjdXRlO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgYXN5bmMgX2V4ZWN1dGUob3B0aW9uczogUXVlcnlPcHRpb25zKTogUHJvbWlzZTxRdWVyeVJlc3BvbnNlPFI+PiB7XG4gICAgY29uc3QgeyBoZWFkZXJzLCByZXNwb25zZVRhcmdldCwgYXV0b0ZldGNoLCBtYXhGZXRjaCwgc2NhbkFsbCB9ID0gb3B0aW9ucztcbiAgICBsZXQgdXJsID0gJyc7XG4gICAgaWYgKHRoaXMuX2xvY2F0b3IpIHtcbiAgICAgIHVybCA9IFt0aGlzLl9jb25uLl9iYXNlVXJsKCksICcvcXVlcnkvJywgdGhpcy5fbG9jYXRvcl0uam9pbignJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHNvcWwgPSBhd2FpdCB0aGlzLnRvU09RTCgpO1xuICAgICAgdGhpcy50b3RhbEZldGNoZWQgPSAwO1xuICAgICAgdGhpcy5fbG9nZ2VyLmRlYnVnKGBTT1FMID0gJHtzb3FsfWApO1xuICAgICAgdXJsID0gW1xuICAgICAgICB0aGlzLl9jb25uLl9iYXNlVXJsKCksXG4gICAgICAgICcvJyxcbiAgICAgICAgc2NhbkFsbCA/ICdxdWVyeUFsbCcgOiAncXVlcnknLFxuICAgICAgICAnP3E9JyxcbiAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNvcWwpLFxuICAgICAgXS5qb2luKCcnKTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuX2Nvbm4ucmVxdWVzdDxSPih7IG1ldGhvZDogJ0dFVCcsIHVybCwgaGVhZGVycyB9KTtcbiAgICB0aGlzLmVtaXQoJ2ZldGNoJyk7XG4gICAgdGhpcy50b3RhbFNpemUgPSBkYXRhLnRvdGFsU2l6ZTtcbiAgICBsZXQgcmVzO1xuICAgIHN3aXRjaCAocmVzcG9uc2VUYXJnZXQpIHtcbiAgICAgIGNhc2UgUmVzcG9uc2VUYXJnZXRzLlNpbmdsZVJlY29yZDpcbiAgICAgICAgcmVzID0gZGF0YS5yZWNvcmRzICYmIGRhdGEucmVjb3Jkcy5sZW5ndGggPiAwID8gZGF0YS5yZWNvcmRzWzBdIDogbnVsbDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFJlc3BvbnNlVGFyZ2V0cy5SZWNvcmRzOlxuICAgICAgICByZXMgPSBkYXRhLnJlY29yZHM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBSZXNwb25zZVRhcmdldHMuQ291bnQ6XG4gICAgICAgIHJlcyA9IGRhdGEudG90YWxTaXplO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJlcyA9IGRhdGE7XG4gICAgfVxuICAgIC8vIG9ubHkgZmlyZSByZXNwb25zZSBldmVudCB3aGVuIGl0IHNob3VsZCBiZSBub3RpZmllZCBwZXIgZmV0Y2hcbiAgICBpZiAocmVzcG9uc2VUYXJnZXQgIT09IFJlc3BvbnNlVGFyZ2V0cy5SZWNvcmRzKSB7XG4gICAgICB0aGlzLmVtaXQoJ3Jlc3BvbnNlJywgcmVzLCB0aGlzKTtcbiAgICB9XG5cbiAgICAvLyBzdHJlYW1pbmcgcmVjb3JkIGluc3RhbmNlc1xuICAgIGNvbnN0IG51bVJlY29yZHMgPSAoZGF0YS5yZWNvcmRzICYmIGRhdGEucmVjb3Jkcy5sZW5ndGgpIHx8IDA7XG4gICAgbGV0IHRvdGFsRmV0Y2hlZCA9IHRoaXMudG90YWxGZXRjaGVkIHx8IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1SZWNvcmRzOyBpKyspIHtcbiAgICAgIGlmICh0b3RhbEZldGNoZWQgPj0gbWF4RmV0Y2gpIHtcbiAgICAgICAgdGhpcy5fZmluaXNoZWQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlY29yZCA9IGRhdGEucmVjb3Jkc1tpXTtcbiAgICAgIHRoaXMuZW1pdCgncmVjb3JkJywgcmVjb3JkLCB0b3RhbEZldGNoZWQsIHRoaXMpO1xuICAgICAgdG90YWxGZXRjaGVkICs9IDE7XG4gICAgfVxuICAgIHRoaXMudG90YWxGZXRjaGVkID0gdG90YWxGZXRjaGVkO1xuICAgIGlmIChkYXRhLm5leHRSZWNvcmRzVXJsKSB7XG4gICAgICB0aGlzLl9sb2NhdG9yID0gZGF0YS5uZXh0UmVjb3Jkc1VybC5zcGxpdCgnLycpLnBvcCgpO1xuICAgIH1cbiAgICB0aGlzLl9maW5pc2hlZCA9IHRoaXMuX2ZpbmlzaGVkIHx8IGRhdGEuZG9uZSB8fCAhYXV0b0ZldGNoO1xuICAgIGlmICh0aGlzLl9maW5pc2hlZCkge1xuICAgICAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZXhlY3V0ZShvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBPYnRhaW4gcmVhZGFibGUgc3RyZWFtIGluc3RhbmNlXG4gICAqL1xuICBzdHJlYW0odHlwZTogJ3JlY29yZCcpOiBTZXJpYWxpemFibGU8Uj47XG4gIHN0cmVhbSh0eXBlOiAnY3N2Jyk6IFJlYWRhYmxlO1xuICBzdHJlYW0odHlwZTogJ3JlY29yZCcgfCAnY3N2JyA9ICdjc3YnKSB7XG4gICAgaWYgKCF0aGlzLl9maW5pc2hlZCAmJiAhdGhpcy5fZXhlY3V0ZWQpIHtcbiAgICAgIHRoaXMuZXhlY3V0ZSh7IGF1dG9GZXRjaDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGUgPT09ICdyZWNvcmQnID8gdGhpcy5fc3RyZWFtIDogdGhpcy5fc3RyZWFtLnN0cmVhbSh0eXBlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQaXBlIHRoZSBxdWVyaWVkIHJlY29yZHMgdG8gYW5vdGhlciBzdHJlYW1cbiAgICogVGhpcyBpcyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eTsgUXVlcnkgaXMgbm90IGEgcmVjb3JkIHN0cmVhbSBpbnN0YW5jZSBhbnltb3JlIGluIDIuMC5cbiAgICogSWYgeW91IHdhbnQgYSByZWNvcmQgc3RyZWFtIGluc3RhbmNlLCB1c2UgYFF1ZXJ5I3N0cmVhbSgncmVjb3JkJylgLlxuICAgKi9cbiAgcGlwZShzdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSkge1xuICAgIHJldHVybiB0aGlzLnN0cmVhbSgncmVjb3JkJykucGlwZShzdHJlYW0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcm90ZWN0ZWRcbiAgICovXG4gIGFzeW5jIF9leHBhbmRGaWVsZHMoc29iamVjdF8/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fc29xbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnQ2Fubm90IGV4cGFuZCBmaWVsZHMgZm9yIHRoZSBxdWVyeSB3aGljaCBoYXMgYWxyZWFkeSBidWlsdCBTT1FMLicsXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCB7IGZpZWxkcyA9IFtdLCB0YWJsZSA9ICcnIH0gPSB0aGlzLl9jb25maWc7XG4gICAgY29uc3Qgc29iamVjdCA9IHNvYmplY3RfIHx8IHRhYmxlO1xuICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZyhcbiAgICAgIGBfZXhwYW5kRmllbGRzOiBzb2JqZWN0ID0gJHtzb2JqZWN0fSwgZmllbGRzID0gJHtmaWVsZHMuam9pbignLCAnKX1gLFxuICAgICk7XG4gICAgY29uc3QgW2VmaWVsZHNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgdGhpcy5fZXhwYW5kQXN0ZXJpc2tGaWVsZHMoc29iamVjdCwgZmllbGRzKSxcbiAgICAgIC4uLnRoaXMuX2NoaWxkcmVuLm1hcChhc3luYyAoY2hpbGRRdWVyeSkgPT4ge1xuICAgICAgICBhd2FpdCBjaGlsZFF1ZXJ5Ll9leHBhbmRGaWVsZHMoKTtcbiAgICAgICAgcmV0dXJuIFtdIGFzIHN0cmluZ1tdO1xuICAgICAgfSksXG4gICAgXSk7XG4gICAgdGhpcy5fY29uZmlnLmZpZWxkcyA9IGVmaWVsZHM7XG4gICAgdGhpcy5fY29uZmlnLmluY2x1ZGVzID0gdGhpcy5fY2hpbGRyZW5cbiAgICAgIC5tYXAoKGNxdWVyeSkgPT4ge1xuICAgICAgICBjb25zdCBjY29uZmlnID0gY3F1ZXJ5Ll9xdWVyeS5fY29uZmlnO1xuICAgICAgICByZXR1cm4gW2Njb25maWcudGFibGUsIGNjb25maWddIGFzIFtzdHJpbmcsIFNPUUxRdWVyeUNvbmZpZ107XG4gICAgICB9KVxuICAgICAgLnJlZHVjZShcbiAgICAgICAgKGluY2x1ZGVzLCBbY3RhYmxlLCBjY29uZmlnXSkgPT4gKHtcbiAgICAgICAgICAuLi5pbmNsdWRlcyxcbiAgICAgICAgICBbY3RhYmxlXTogY2NvbmZpZyxcbiAgICAgICAgfSksXG4gICAgICAgIHt9IGFzIHsgW25hbWU6IHN0cmluZ106IFNPUUxRdWVyeUNvbmZpZyB9LFxuICAgICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgYXN5bmMgX2ZpbmRSZWxhdGlvbk9iamVjdChyZWxOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHRhYmxlID0gdGhpcy5fY29uZmlnLnRhYmxlO1xuICAgIGlmICghdGFibGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gdGFibGUgaW5mb3JtYXRpb24gcHJvdmlkZWQgaW4gdGhlIHF1ZXJ5Jyk7XG4gICAgfVxuICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZyhcbiAgICAgIGBmaW5kaW5nIHRhYmxlIGZvciByZWxhdGlvbiBcIiR7cmVsTmFtZX1cIiBpbiBcIiR7dGFibGV9XCIuLi5gLFxuICAgICk7XG4gICAgY29uc3Qgc29iamVjdCA9IGF3YWl0IHRoaXMuX2Nvbm4uZGVzY3JpYmUkKHRhYmxlKTtcbiAgICBjb25zdCB1cHBlclJuYW1lID0gcmVsTmFtZS50b1VwcGVyQ2FzZSgpO1xuICAgIGZvciAoY29uc3QgY3Igb2Ygc29iamVjdC5jaGlsZFJlbGF0aW9uc2hpcHMpIHtcbiAgICAgIGlmIChcbiAgICAgICAgKGNyLnJlbGF0aW9uc2hpcE5hbWUgfHwgJycpLnRvVXBwZXJDYXNlKCkgPT09IHVwcGVyUm5hbWUgJiZcbiAgICAgICAgY3IuY2hpbGRTT2JqZWN0XG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGNyLmNoaWxkU09iamVjdDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBObyBjaGlsZCByZWxhdGlvbnNoaXAgZm91bmQ6ICR7cmVsTmFtZX1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgYXN5bmMgX2V4cGFuZEFzdGVyaXNrRmllbGRzKFxuICAgIHNvYmplY3Q6IHN0cmluZyxcbiAgICBmaWVsZHM6IHN0cmluZ1tdLFxuICApOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgZXhwYW5kZWRGaWVsZHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIGZpZWxkcy5tYXAoYXN5bmMgKGZpZWxkKSA9PiB0aGlzLl9leHBhbmRBc3Rlcmlza0ZpZWxkKHNvYmplY3QsIGZpZWxkKSksXG4gICAgKTtcbiAgICByZXR1cm4gZXhwYW5kZWRGaWVsZHMucmVkdWNlKFxuICAgICAgKGVmbGRzOiBzdHJpbmdbXSwgZmxkczogc3RyaW5nW10pOiBzdHJpbmdbXSA9PiBbLi4uZWZsZHMsIC4uLmZsZHNdLFxuICAgICAgW10sXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgYXN5bmMgX2V4cGFuZEFzdGVyaXNrRmllbGQoXG4gICAgc29iamVjdDogc3RyaW5nLFxuICAgIGZpZWxkOiBzdHJpbmcsXG4gICk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICB0aGlzLl9sb2dnZXIuZGVidWcoYGV4cGFuZGluZyBmaWVsZCBcIiR7ZmllbGR9XCIgaW4gXCIke3NvYmplY3R9XCIuLi5gKTtcbiAgICBjb25zdCBmcGF0aCA9IGZpZWxkLnNwbGl0KCcuJyk7XG4gICAgaWYgKGZwYXRoW2ZwYXRoLmxlbmd0aCAtIDFdID09PSAnKicpIHtcbiAgICAgIGNvbnN0IHNvID0gYXdhaXQgdGhpcy5fY29ubi5kZXNjcmliZSQoc29iamVjdCk7XG4gICAgICB0aGlzLl9sb2dnZXIuZGVidWcoYHRhYmxlICR7c29iamVjdH0gaGFzIGJlZW4gZGVzY3JpYmVkYCk7XG4gICAgICBpZiAoZnBhdGgubGVuZ3RoID4gMSkge1xuICAgICAgICBjb25zdCBybmFtZSA9IGZwYXRoLnNoaWZ0KCk7XG4gICAgICAgIGZvciAoY29uc3QgZiBvZiBzby5maWVsZHMpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBmLnJlbGF0aW9uc2hpcE5hbWUgJiZcbiAgICAgICAgICAgIHJuYW1lICYmXG4gICAgICAgICAgICBmLnJlbGF0aW9uc2hpcE5hbWUudG9VcHBlckNhc2UoKSA9PT0gcm5hbWUudG9VcHBlckNhc2UoKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgcmZpZWxkID0gZjtcbiAgICAgICAgICAgIGNvbnN0IHJlZmVyZW5jZVRvID0gcmZpZWxkLnJlZmVyZW5jZVRvIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgcnRhYmxlID0gcmVmZXJlbmNlVG8ubGVuZ3RoID09PSAxID8gcmVmZXJlbmNlVG9bMF0gOiAnTmFtZSc7XG4gICAgICAgICAgICBjb25zdCBmcGF0aHMgPSBhd2FpdCB0aGlzLl9leHBhbmRBc3Rlcmlza0ZpZWxkKFxuICAgICAgICAgICAgICBydGFibGUsXG4gICAgICAgICAgICAgIGZwYXRoLmpvaW4oJy4nKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gZnBhdGhzLm1hcCgoZnApID0+IGAke3JuYW1lfS4ke2ZwfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG4gICAgICByZXR1cm4gc28uZmllbGRzLm1hcCgoZikgPT4gZi5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIFtmaWVsZF07XG4gIH1cblxuICAvKipcbiAgICogRXhwbGFpbiBwbGFuIGZvciBleGVjdXRpbmcgcXVlcnlcbiAgICovXG4gIGFzeW5jIGV4cGxhaW4oKSB7XG4gICAgY29uc3Qgc29xbCA9IGF3YWl0IHRoaXMudG9TT1FMKCk7XG4gICAgdGhpcy5fbG9nZ2VyLmRlYnVnKGBTT1FMID0gJHtzb3FsfWApO1xuICAgIGNvbnN0IHVybCA9IGAvcXVlcnkvP2V4cGxhaW49JHtlbmNvZGVVUklDb21wb25lbnQoc29xbCl9YDtcbiAgICByZXR1cm4gdGhpcy5fY29ubi5yZXF1ZXN0PFF1ZXJ5RXhwbGFpblJlc3VsdD4odXJsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gU09RTCBleHByZXNzaW9uIGZvciB0aGUgcXVlcnlcbiAgICovXG4gIGFzeW5jIHRvU09RTCgpIHtcbiAgICBpZiAodGhpcy5fc29xbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3NvcWw7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuX2V4cGFuZEZpZWxkcygpO1xuICAgIHJldHVybiBjcmVhdGVTT1FMKHRoaXMuX2NvbmZpZyk7XG4gIH1cblxuICAvKipcbiAgICogUHJvbWlzZS9BKyBpbnRlcmZhY2VcbiAgICogaHR0cDovL3Byb21pc2VzLWFwbHVzLmdpdGh1Yi5pby9wcm9taXNlcy1zcGVjL1xuICAgKlxuICAgKiBEZWxlZ2F0ZSB0byBkZWZlcnJlZCBwcm9taXNlLCByZXR1cm4gcHJvbWlzZSBpbnN0YW5jZSBmb3IgcXVlcnkgcmVzdWx0XG4gICAqL1xuICB0aGVuPFUsIFY+KFxuICAgIG9uUmVzb2x2ZT86XG4gICAgICB8ICgocXI6IFF1ZXJ5UmVzcG9uc2U8UiwgUVJUPikgPT4gVSB8IFByb21pc2U8VT4pXG4gICAgICB8IG51bGxcbiAgICAgIHwgdW5kZWZpbmVkLFxuICAgIG9uUmVqZWN0PzogKChlcnI6IEVycm9yKSA9PiBWIHwgUHJvbWlzZTxWPikgfCBudWxsIHwgdW5kZWZpbmVkLFxuICApOiBQcm9taXNlPFUgfCBWPiB7XG4gICAgdGhpcy5fY2hhaW5pbmcgPSB0cnVlO1xuICAgIGlmICghdGhpcy5fZmluaXNoZWQgJiYgIXRoaXMuX2V4ZWN1dGVkKSB7XG4gICAgICB0aGlzLmV4ZWN1dGUoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLl9wcm9taXNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdpbnZhbGlkIHN0YXRlOiBwcm9taXNlIGlzIG5vdCBzZXQgYWZ0ZXIgcXVlcnkgZXhlY3V0aW9uJyxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wcm9taXNlLnRoZW4ob25SZXNvbHZlLCBvblJlamVjdCk7XG4gIH1cblxuICBjYXRjaChcbiAgICBvblJlamVjdDogKFxuICAgICAgZXJyOiBFcnJvcixcbiAgICApID0+IFF1ZXJ5UmVzcG9uc2U8UiwgUVJUPiB8IFByb21pc2U8UXVlcnlSZXNwb25zZTxSLCBRUlQ+PixcbiAgKTogUHJvbWlzZTxRdWVyeVJlc3BvbnNlPFIsIFFSVD4+IHtcbiAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0KTtcbiAgfVxuXG4gIHByb21pc2UoKTogUHJvbWlzZTxRdWVyeVJlc3BvbnNlPFIsIFFSVD4+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1bGsgZGVsZXRlIHF1ZXJpZWQgcmVjb3Jkc1xuICAgKi9cbiAgZGVzdHJveShvcHRpb25zPzogUXVlcnlEZXN0cm95T3B0aW9ucyk6IFByb21pc2U8U2F2ZVJlc3VsdFtdPjtcbiAgZGVzdHJveSh0eXBlOiBOLCBvcHRpb25zPzogUXVlcnlEZXN0cm95T3B0aW9ucyk6IFByb21pc2U8U2F2ZVJlc3VsdFtdPjtcbiAgZGVzdHJveSh0eXBlPzogTiB8IFF1ZXJ5RGVzdHJveU9wdGlvbnMsIG9wdGlvbnM/OiBRdWVyeURlc3Ryb3lPcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnb2JqZWN0JyAmJiB0eXBlICE9PSBudWxsKSB7XG4gICAgICBvcHRpb25zID0gdHlwZTtcbiAgICAgIHR5cGUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGNvbnN0IHR5cGVfOiBPcHRpb25hbDxOPiA9IHR5cGUgfHwgKHRoaXMuX2NvbmZpZy50YWJsZSBhcyBPcHRpb25hbDxOPik7XG4gICAgaWYgKCF0eXBlXykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnU09RTCBiYXNlZCBxdWVyeSBuZWVkcyBTT2JqZWN0IHR5cGUgaW5mb3JtYXRpb24gdG8gYnVsayBkZWxldGUuJyxcbiAgICAgICk7XG4gICAgfVxuICAgIC8vIFNldCB0aGUgdGhyZXNob2xkIG51bWJlciB0byBwYXNzIHRvIGJ1bGsgQVBJXG4gICAgY29uc3QgdGhyZXNob2xkTnVtID1cbiAgICAgIG9wdGlvbnMuYWxsb3dCdWxrID09PSBmYWxzZVxuICAgICAgICA/IC0xXG4gICAgICAgIDogdHlwZW9mIG9wdGlvbnMuYnVsa1RocmVzaG9sZCA9PT0gJ251bWJlcidcbiAgICAgICAgPyBvcHRpb25zLmJ1bGtUaHJlc2hvbGRcbiAgICAgICAgOiAvLyBkZXRlcm1pbmUgdGhyZXNob2xkIGlmIHRoZSBjb25uZWN0aW9uIHZlcnNpb24gc3VwcG9ydHMgU09iamVjdCBjb2xsZWN0aW9uIEFQSSBvciBub3RcbiAgICAgICAgdGhpcy5fY29ubi5fZW5zdXJlVmVyc2lvbig0MilcbiAgICAgICAgPyBERUZBVUxUX0JVTEtfVEhSRVNIT0xEXG4gICAgICAgIDogdGhpcy5fY29ubi5fbWF4UmVxdWVzdCAvIDI7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGNyZWF0ZUJhdGNoID0gKCkgPT5cbiAgICAgICAgdGhpcy5fY29ublxuICAgICAgICAgIC5zb2JqZWN0KHR5cGVfKVxuICAgICAgICAgIC5kZWxldGVCdWxrKClcbiAgICAgICAgICAub24oJ3Jlc3BvbnNlJywgcmVzb2x2ZSlcbiAgICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICAgIGxldCByZWNvcmRzOiBSZWNvcmRbXSA9IFtdO1xuICAgICAgbGV0IGJhdGNoOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVCYXRjaD4gfCBudWxsID0gbnVsbDtcbiAgICAgIGNvbnN0IGhhbmRsZVJlY29yZCA9IChyZWM6IFJlY29yZCkgPT4ge1xuICAgICAgICBpZiAoIXJlYy5JZCkge1xuICAgICAgICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdRdWVyaWVkIHJlY29yZCBkb2VzIG5vdCBpbmNsdWRlIFNhbGVzZm9yY2UgcmVjb3JkIElELicsXG4gICAgICAgICAgKTtcbiAgICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVjb3JkOiBSZWNvcmQgPSB7IElkOiByZWMuSWQgfTtcbiAgICAgICAgaWYgKGJhdGNoKSB7XG4gICAgICAgICAgYmF0Y2gud3JpdGUocmVjb3JkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWNvcmRzLnB1c2gocmVjb3JkKTtcbiAgICAgICAgICBpZiAodGhyZXNob2xkTnVtID49IDAgJiYgcmVjb3Jkcy5sZW5ndGggPiB0aHJlc2hvbGROdW0pIHtcbiAgICAgICAgICAgIC8vIFVzZSBidWxrIGRlbGV0ZSBpbnN0ZWFkIG9mIFNPYmplY3QgUkVTVCBBUElcbiAgICAgICAgICAgIGJhdGNoID0gY3JlYXRlQmF0Y2goKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIHJlY29yZHMpIHtcbiAgICAgICAgICAgICAgYmF0Y2gud3JpdGUocmVjb3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlY29yZHMgPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCBoYW5kbGVFbmQgPSAoKSA9PiB7XG4gICAgICAgIGlmIChiYXRjaCkge1xuICAgICAgICAgIGJhdGNoLmVuZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGlkcyA9IHJlY29yZHMubWFwKChyZWNvcmQpID0+IHJlY29yZC5JZCBhcyBzdHJpbmcpO1xuICAgICAgICAgIHRoaXMuX2Nvbm5cbiAgICAgICAgICAgIC5zb2JqZWN0KHR5cGVfKVxuICAgICAgICAgICAgLmRlc3Ryb3koaWRzLCB7IGFsbG93UmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgICAgICAgICAudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdGhpcy5zdHJlYW0oJ3JlY29yZCcpXG4gICAgICAgIC5vbignZGF0YScsIGhhbmRsZVJlY29yZClcbiAgICAgICAgLm9uKCdlbmQnLCBoYW5kbGVFbmQpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFN5bm9ueW0gb2YgUXVlcnkjZGVzdHJveSgpXG4gICAqL1xuICBkZWxldGUgPSB0aGlzLmRlc3Ryb3k7XG5cbiAgLyoqXG4gICAqIFN5bm9ueW0gb2YgUXVlcnkjZGVzdHJveSgpXG4gICAqL1xuICBkZWwgPSB0aGlzLmRlc3Ryb3k7XG5cbiAgLyoqXG4gICAqIEJ1bGsgdXBkYXRlIHF1ZXJpZWQgcmVjb3JkcywgdXNpbmcgZ2l2ZW4gbWFwcGluZyBmdW5jdGlvbi9vYmplY3RcbiAgICovXG4gIHVwZGF0ZTxVUiBleHRlbmRzIFNPYmplY3RJbnB1dFJlY29yZDxTLCBOPj4oXG4gICAgbWFwcGluZzogKChyZWM6IFIpID0+IFVSKSB8IFVSLFxuICAgIHR5cGU6IE4sXG4gICAgb3B0aW9ucz86IFF1ZXJ5VXBkYXRlT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxTYXZlUmVzdWx0W10+O1xuICB1cGRhdGU8VVIgZXh0ZW5kcyBTT2JqZWN0SW5wdXRSZWNvcmQ8UywgTj4+KFxuICAgIG1hcHBpbmc6ICgocmVjOiBSKSA9PiBVUikgfCBVUixcbiAgICBvcHRpb25zPzogUXVlcnlVcGRhdGVPcHRpb25zLFxuICApOiBQcm9taXNlPFNhdmVSZXN1bHRbXT47XG4gIHVwZGF0ZTxVUiBleHRlbmRzIFNPYmplY3RJbnB1dFJlY29yZDxTLCBOPj4oXG4gICAgbWFwcGluZzogKChyZWM6IFIpID0+IFVSKSB8IFVSLFxuICAgIHR5cGU/OiBOIHwgUXVlcnlVcGRhdGVPcHRpb25zLFxuICAgIG9wdGlvbnM/OiBRdWVyeVVwZGF0ZU9wdGlvbnMsXG4gICkge1xuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ29iamVjdCcgJiYgdHlwZSAhPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucyA9IHR5cGU7XG4gICAgICB0eXBlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBjb25zdCB0eXBlXzogT3B0aW9uYWw8Tj4gPVxuICAgICAgdHlwZSB8fCAodGhpcy5fY29uZmlnICYmICh0aGlzLl9jb25maWcudGFibGUgYXMgT3B0aW9uYWw8Tj4pKTtcbiAgICBpZiAoIXR5cGVfKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdTT1FMIGJhc2VkIHF1ZXJ5IG5lZWRzIFNPYmplY3QgdHlwZSBpbmZvcm1hdGlvbiB0byBidWxrIHVwZGF0ZS4nLFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgdXBkYXRlU3RyZWFtID1cbiAgICAgIHR5cGVvZiBtYXBwaW5nID09PSAnZnVuY3Rpb24nXG4gICAgICAgID8gUmVjb3JkU3RyZWFtLm1hcChtYXBwaW5nKVxuICAgICAgICA6IFJlY29yZFN0cmVhbS5yZWNvcmRNYXBTdHJlYW0obWFwcGluZyk7XG4gICAgLy8gU2V0IHRoZSB0aHJlc2hvbGQgbnVtYmVyIHRvIHBhc3MgdG8gYnVsayBBUElcbiAgICBjb25zdCB0aHJlc2hvbGROdW0gPVxuICAgICAgb3B0aW9ucy5hbGxvd0J1bGsgPT09IGZhbHNlXG4gICAgICAgID8gLTFcbiAgICAgICAgOiB0eXBlb2Ygb3B0aW9ucy5idWxrVGhyZXNob2xkID09PSAnbnVtYmVyJ1xuICAgICAgICA/IG9wdGlvbnMuYnVsa1RocmVzaG9sZFxuICAgICAgICA6IC8vIGRldGVybWluZSB0aHJlc2hvbGQgaWYgdGhlIGNvbm5lY3Rpb24gdmVyc2lvbiBzdXBwb3J0cyBTT2JqZWN0IGNvbGxlY3Rpb24gQVBJIG9yIG5vdFxuICAgICAgICB0aGlzLl9jb25uLl9lbnN1cmVWZXJzaW9uKDQyKVxuICAgICAgICA/IERFRkFVTFRfQlVMS19USFJFU0hPTERcbiAgICAgICAgOiB0aGlzLl9jb25uLl9tYXhSZXF1ZXN0IC8gMjtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgY3JlYXRlQmF0Y2ggPSAoKSA9PlxuICAgICAgICB0aGlzLl9jb25uXG4gICAgICAgICAgLnNvYmplY3QodHlwZV8pXG4gICAgICAgICAgLnVwZGF0ZUJ1bGsoKVxuICAgICAgICAgIC5vbigncmVzcG9uc2UnLCByZXNvbHZlKVxuICAgICAgICAgIC5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgbGV0IHJlY29yZHM6IFNPYmplY3RVcGRhdGVSZWNvcmQ8UywgTj5bXSA9IFtdO1xuICAgICAgbGV0IGJhdGNoOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVCYXRjaD4gfCBudWxsID0gbnVsbDtcbiAgICAgIGNvbnN0IGhhbmRsZVJlY29yZCA9IChyZWNvcmQ6IFJlY29yZCkgPT4ge1xuICAgICAgICBpZiAoYmF0Y2gpIHtcbiAgICAgICAgICBiYXRjaC53cml0ZShyZWNvcmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlY29yZHMucHVzaChyZWNvcmQgYXMgU09iamVjdFVwZGF0ZVJlY29yZDxTLCBOPik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRocmVzaG9sZE51bSA+PSAwICYmIHJlY29yZHMubGVuZ3RoID4gdGhyZXNob2xkTnVtKSB7XG4gICAgICAgICAgLy8gVXNlIGJ1bGsgdXBkYXRlIGluc3RlYWQgb2YgU09iamVjdCBSRVNUIEFQSVxuICAgICAgICAgIGJhdGNoID0gY3JlYXRlQmF0Y2goKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBiYXRjaC53cml0ZShyZWNvcmQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWNvcmRzID0gW107XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCBoYW5kbGVFbmQgPSAoKSA9PiB7XG4gICAgICAgIGlmIChiYXRjaCkge1xuICAgICAgICAgIGJhdGNoLmVuZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2Nvbm5cbiAgICAgICAgICAgIC5zb2JqZWN0KHR5cGVfKVxuICAgICAgICAgICAgLnVwZGF0ZShyZWNvcmRzLCB7IGFsbG93UmVjdXJzaXZlOiB0cnVlIH0pXG4gICAgICAgICAgICAudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdGhpcy5zdHJlYW0oJ3JlY29yZCcpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpXG4gICAgICAgIC5waXBlKHVwZGF0ZVN0cmVhbSlcbiAgICAgICAgLm9uKCdkYXRhJywgaGFuZGxlUmVjb3JkKVxuICAgICAgICAub24oJ2VuZCcsIGhhbmRsZUVuZClcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cbn1cblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbi8qKlxuICogU3ViUXVlcnkgb2JqZWN0IGZvciByZXByZXNlbnRpbmcgY2hpbGQgcmVsYXRpb25zaGlwIHF1ZXJ5XG4gKi9cbmV4cG9ydCBjbGFzcyBTdWJRdWVyeTxcbiAgUyBleHRlbmRzIFNjaGVtYSxcbiAgUE4gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4sXG4gIFBSIGV4dGVuZHMgUmVjb3JkLFxuICBQUVJUIGV4dGVuZHMgUXVlcnlSZXNwb25zZVRhcmdldCxcbiAgQ1JOIGV4dGVuZHMgQ2hpbGRSZWxhdGlvbnNoaXBOYW1lczxTLCBQTj4gPSBDaGlsZFJlbGF0aW9uc2hpcE5hbWVzPFMsIFBOPixcbiAgQ04gZXh0ZW5kcyBTT2JqZWN0TmFtZXM8Uz4gPSBDaGlsZFJlbGF0aW9uc2hpcFNPYmplY3ROYW1lPFMsIFBOLCBDUk4+LFxuICBDUiBleHRlbmRzIFJlY29yZCA9IFJlY29yZFxuPiB7XG4gIF9yZWxOYW1lOiBDUk47XG4gIF9xdWVyeTogUXVlcnk8UywgQ04sIENSPjtcbiAgX3BhcmVudDogUXVlcnk8UywgUE4sIFBSLCBQUVJUPjtcblxuICAvKipcbiAgICpcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIGNvbm46IENvbm5lY3Rpb248Uz4sXG4gICAgcmVsTmFtZTogQ1JOLFxuICAgIGNvbmZpZzogUXVlcnlDb25maWc8UywgQ04+LFxuICAgIHBhcmVudDogUXVlcnk8UywgUE4sIFBSLCBQUVJUPixcbiAgKSB7XG4gICAgdGhpcy5fcmVsTmFtZSA9IHJlbE5hbWU7XG4gICAgdGhpcy5fcXVlcnkgPSBuZXcgUXVlcnkoY29ubiwgY29uZmlnKTtcbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICovXG4gIHNlbGVjdDxcbiAgICBSIGV4dGVuZHMgUmVjb3JkID0gUmVjb3JkLFxuICAgIEZQIGV4dGVuZHMgRmllbGRQYXRoU3BlY2lmaWVyPFMsIENOPiA9IEZpZWxkUGF0aFNwZWNpZmllcjxTLCBDTj4sXG4gICAgRlBDIGV4dGVuZHMgRmllbGRQcm9qZWN0aW9uQ29uZmlnID0gRmllbGRQYXRoU2NvcGVkUHJvamVjdGlvbjxTLCBDTiwgRlA+XG4gID4oXG4gICAgZmllbGRzOiBRdWVyeUZpZWxkPFMsIENOLCBGUD4sXG4gICk6IFN1YlF1ZXJ5PFMsIFBOLCBQUiwgUFFSVCwgQ1JOLCBDTiwgU09iamVjdFJlY29yZDxTLCBDTiwgRlBDLCBSPj4ge1xuICAgIC8vIGZvcmNlIGNvbnZlcnQgcXVlcnkgcmVjb3JkIHR5cGUgd2l0aG91dCBjaGFuZ2luZyBpbnN0YW5jZVxuICAgIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkuc2VsZWN0KGZpZWxkcykgYXMgYW55O1xuICAgIHJldHVybiAodGhpcyBhcyBhbnkpIGFzIFN1YlF1ZXJ5PFxuICAgICAgUyxcbiAgICAgIFBOLFxuICAgICAgUFIsXG4gICAgICBQUVJULFxuICAgICAgQ1JOLFxuICAgICAgQ04sXG4gICAgICBTT2JqZWN0UmVjb3JkPFMsIENOLCBGUEMsIFI+XG4gICAgPjtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgd2hlcmUoY29uZGl0aW9uczogUXVlcnlDb25kaXRpb248UywgQ04+IHwgc3RyaW5nKTogdGhpcyB7XG4gICAgdGhpcy5fcXVlcnkgPSB0aGlzLl9xdWVyeS53aGVyZShjb25kaXRpb25zKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBMaW1pdCB0aGUgcmV0dXJuaW5nIHJlc3VsdFxuICAgKi9cbiAgbGltaXQobGltaXQ6IG51bWJlcikge1xuICAgIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkubGltaXQobGltaXQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNraXAgcmVjb3Jkc1xuICAgKi9cbiAgc2tpcChvZmZzZXQ6IG51bWJlcikge1xuICAgIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkuc2tpcChvZmZzZXQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFN5bm9ueW0gb2YgU3ViUXVlcnkjc2tpcCgpXG4gICAqL1xuICBvZmZzZXQgPSB0aGlzLnNraXA7XG5cbiAgLyoqXG4gICAqIFNldCBxdWVyeSBzb3J0IHdpdGggZGlyZWN0aW9uXG4gICAqL1xuICBzb3J0KHNvcnQ6IFF1ZXJ5U29ydDxTLCBDTj4pOiB0aGlzO1xuICBzb3J0KHNvcnQ6IHN0cmluZyk6IHRoaXM7XG4gIHNvcnQoc29ydDogU09iamVjdEZpZWxkTmFtZXM8UywgQ04+LCBkaXI6IFNvcnREaXIpOiB0aGlzO1xuICBzb3J0KHNvcnQ6IHN0cmluZywgZGlyOiBTb3J0RGlyKTogdGhpcztcbiAgc29ydChcbiAgICBzb3J0OiBRdWVyeVNvcnQ8UywgQ04+IHwgU09iamVjdEZpZWxkTmFtZXM8UywgQ04+IHwgc3RyaW5nLFxuICAgIGRpcj86IFNvcnREaXIsXG4gICkge1xuICAgIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkuc29ydChzb3J0IGFzIGFueSwgZGlyIGFzIFNvcnREaXIpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFN5bm9ueW0gb2YgU3ViUXVlcnkjc29ydCgpXG4gICAqL1xuICBvcmRlcmJ5OiB0eXBlb2YgU3ViUXVlcnkucHJvdG90eXBlLnNvcnQgPSB0aGlzLnNvcnQ7XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBhc3luYyBfZXhwYW5kRmllbGRzKCkge1xuICAgIGNvbnN0IHNvYmplY3QgPSBhd2FpdCB0aGlzLl9wYXJlbnQuX2ZpbmRSZWxhdGlvbk9iamVjdCh0aGlzLl9yZWxOYW1lKTtcbiAgICByZXR1cm4gdGhpcy5fcXVlcnkuX2V4cGFuZEZpZWxkcyhzb2JqZWN0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCYWNrIHRoZSBjb250ZXh0IHRvIHBhcmVudCBxdWVyeSBvYmplY3RcbiAgICovXG4gIGVuZDxcbiAgICBDUlAgZXh0ZW5kcyBTT2JqZWN0Q2hpbGRSZWxhdGlvbnNoaXBQcm9wPFxuICAgICAgQ1JOLFxuICAgICAgQ1JcbiAgICA+ID0gU09iamVjdENoaWxkUmVsYXRpb25zaGlwUHJvcDxDUk4sIENSPixcbiAgICBQUjEgZXh0ZW5kcyBSZWNvcmQgPSBQUiAmIENSUFxuICA+KCk6IFF1ZXJ5PFMsIFBOLCBQUjEsIFBRUlQ+IHtcbiAgICByZXR1cm4gKHRoaXMuX3BhcmVudCBhcyBhbnkpIGFzIFF1ZXJ5PFMsIFBOLCBQUjEsIFBRUlQ+O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFF1ZXJ5O1xuIl19