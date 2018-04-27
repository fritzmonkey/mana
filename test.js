describe('mana', function () {
  'use strict';

  var assume = require('assume')
    , Mana = require('./')
    , Token = Mana.Token;

  var mana = new Mana();

  describe('construction', function () {
    it('is exposed as a function', function() {
      assume(Mana).is.a('function');
    });

    it('exposes the token interface', function() {
      assume(Mana.Token).is.a('function');
    });

    it('exposes a `new` function that returns an instance of mana', function() {
      assume(Mana.new).is.a('function');
      assume(Mana.new()).is.instanceOf(Mana);
    });

    it('calls the initialise function');
  });

  describe('.initialise', function () {
    it('correctly receives all arguments', function (done) {
      var Init = Mana.extend({
        initialise: function (foo, bar) {
          assume(foo).to.equal('bar');
          assume(bar).to.equal('foo');

          done();
        }
      });

      new Init('bar', 'foo');
    });
  });

  describe('#args', function () {
    it('aliases types', function () {
      assume(mana.args([function () {}])).to.have.property('fn');
      assume(mana.args([function () {}])).to.have.property('function');

      assume(mana.args([{}])).to.have.property('options');
      assume(mana.args([{}])).to.have.property('object');

      assume(mana.args(['foo'])).to.have.property('str');
      assume(mana.args(['foo'])).to.have.property('string');

      assume(mana.args([0])).to.have.property('nr');
      assume(mana.args([0])).to.have.property('number');

      assume(mana.args([[]])).to.have.property('array');
      assume(mana.args([new Date])).to.have.property('date');
    });

    it('parses multiple types correctly', function () {
      var types = mana.args([{}, 'str']);

      assume(types).to.have.property('string');
      assume(types).to.have.property('object');
    });
  });

  describe('#querystring, #json', function () {
    it('returns an empty string if no querystring can be made', function () {
      assume(mana.querystring({}, {})).to.equal('');
      assume(mana.querystring({}, [])).to.equal('');
      assume(mana.querystring({}, ['foo'])).to.equal('');
    });

    it('prefixes the querystring with a ?', function () {
      assume(mana.querystring({ foo: 'bar' }, ['foo'])).to.equal('?foo=bar');
    });

    it('supports default query strings but ignores `undefined` as value', function () {
      assume(mana.querystring({}, { foo: 'bar' })).to.equal('?foo=bar');
      assume(mana.querystring({}, { foo: undefined })).to.equal('');
      assume(mana.querystring({}, { foo: 0 })).to.equal('?foo=0');
      assume(mana.querystring({}, { foo: 0, bar: 'bar' })).to.equal('?foo=0&bar=bar');
    });

    it('removes the found querystrings from the first options argument', function () {
      var options = {
        foo: 'bar',
        bar: 'foo'
      }, query = mana.querystring(options, ['foo']);

      assume(query).to.equal('?foo=bar');
      assume(options).to.not.have.property('foo');
      assume(options.bar).to.equal('foo');
      assume(Object.keys(options).length).to.equal(1);
    });
  });

  describe('#type', function () {
    it('detects array', function () {
      assume(mana.type([])).to.equal('array');
    });

    it('detects regexp', function () {
      assume(mana.type(/\//)).to.equal('regexp');
    });

    it('detects function', function () {
      assume(mana.type(function() {})).to.equal('function');
    });

    it('detects string', function () {
      assume(mana.type('string')).to.equal('string');
    });

    it('detects error', function () {
      assume(mana.type(new Error())).to.equal('error');
    });

    it('detects date', function () {
      assume(mana.type(new Date())).to.equal('date');
    });

    it('detects object', function () {
      assume(mana.type({})).to.equal('object');
    });
  });

  describe('tokenizer', function () {
    it('prefixes tokens with a custom prefix', function () {
      var NaNa = Mana.extend({
        prefix: 'hello-world '
      });

      var nana = new NaNa();
      nana.tokens = ['foo', 'bar'];
      nana.tokenizer();

      assume(nana.tokens.length).to.equal(2);
      nana.tokens.forEach(function (token) {
        assume(token).to.be.instanceOf(Token);
        assume(/hello-world (foo|bar)/i.test(token.authorization)).to.equal(true);
      });
    });

    it('transforms all tokens to Token instances', function () {
      mana.tokens = ['foo', 'bar'];
      mana.tokenizer();

      assume(mana.tokens.length).to.equal(2);
      mana.tokens.forEach(function (token) {
        assume(token).to.be.instanceOf(Token);
        assume(/token (foo|bar)/i.test(token.authorization)).to.equal(true);
      });
    });

    it('removes undefined values', function () {
      mana.tokens = ['foo', undefined];
      mana.tokenizer();

      assume(mana.tokens.length).to.equal(1);
    });

    it('prevents duplicate tokens', function () {
      mana.tokens =  ['foo', 'foo', 'bar'];
      mana.tokenizer().tokenizer().tokens.forEach(function (token) {
        assume(/foo|bar/.test(token.authorization)).to.equal(true);
      });
    });

    it('allows multiple invocations', function () {
      mana.tokens = ['foo', 'bar'];
      mana.tokenizer().tokenizer().tokens.forEach(function (token) {
        assume(token).to.be.instanceOf(Token);
      });
    });

    it('accepts strings and Token instances', function () {
      mana.tokens = ['foo', new Token('banana'), 'bar'];
      mana.tokenizer().tokenizer().tokens.forEach(function (token) {
        assume(token).to.be.instanceOf(Token);
      });
    });
  });

  ['headers', 'graphql'].forEach(function(type) {
    describe('#roll - ' + type, function () {
      beforeEach(function () {
        mana.tokens = ['foo'];
        mana.tokenizer();
        mana.authorization = mana.tokens[0].authorization;
  
        mana[type].ratelimit = 9000;
        mana[type].remaining = 0;
        mana[type].ratereset = Date.now() / 1000;
      });
  
      it('resets the current token to the current rate limit', function () {
        mana.roll(type);
        var token = mana.tokens[0];
  
        assume(token[type].ratelimit).to.equal(mana[type].ratelimit);
        assume(token[type].remaining).to.equal(9000);
        assume(token[type].ratereset).to.equal(mana[type].ratereset);
      });
  
      it('returns boolean values indicating a working token', function () {
        assume(mana.roll(type)).to.equal(true);
  
        mana[type].remaining = 0;
        mana[type].ratereset = (Date.now() / 1000) + 100;
        assume(mana.roll(type)).to.equal(false);
      });
  
      it('returns the most optimal token', function () {
        mana.tokens = ['foob', 'bar', 'baz', 'oof', 'zab'];
        mana.tokenizer();
        mana.tokens.forEach(function (token) {
          token[type].ratelimit = 9000;
          token[type].remaining = 10;
          token[type].ratereset = Date.now();
        });
  
        var token = mana.tokens[2];
        mana.tokens[1][type].remaining = token[type].remaining = 1000;
        token[type].ratelimit = 10000;
  
        assume(mana.roll(type)).to.equal(true);
        assume(token.authorization).to.equal(mana.authorization);
      });
    });
  });

  describe('#downgrade', function () {
    it('calls the function with the first item of the mirror');
    it('continues gets the next mirror on another invocation');
    it('gives an error when its out of mirrors');
  });
});

describe('Tokens', function () {
  'use strict';

  var assume = require('assume')
    , Mana = require('./')
    , Token = Mana.Token;

  var token = new Token('foo')
    , mana = new Mana();

  it('sets all values to Infinity', function () {
    assume(token.headers.ratelimit).to.equal(Infinity);
    assume(token.headers.ratereset).to.equal(Infinity);
    assume(token.headers.remaining).to.equal(Infinity);
    assume(token.graphql.ratelimit).to.equal(Infinity);
    assume(token.graphql.ratereset).to.equal(Infinity);
    assume(token.graphql.remaining).to.equal(Infinity);
  });

  it('transforms the given token to an correct Authorization header value', function () {
    assume(token.authorization).to.equal('token foo');
  });

  it('can set a custom prefix for the token', function () {
    var token = new Token('foo', 'prefix-lol ');
    assume(token.authorization).equals('prefix-lol foo');
  });

  ['headers', 'graphql'].forEach(function(type) {
    describe('#available - ' + type, function () {
      beforeEach(function () {
        token[type].ratelimit = 0;
        token[type].ratereset = (Date.now() / 1000) + 100;
        token[type].remaining = 0;
      });

      it('is unavailable if values are zero', function () {
        assume(token.available(type)).to.equal(false);
      });

      it('is available when fist initialised', function () {
        assume((new Token()).available(type)).to.equal(true);
      });

      it('is available if it has remaining rates', function () {
        assume(token.available(type)).to.equal(false);

        token[type].remaining = 1;
        assume(token.available(type)).to.equal(true);
      });

      it('is available if our rate has been reset', function () {
        assume(token.available(type)).to.equal(false);

        token[type].ratereset = (Date.now() / 1000) - 10;
        assume(token.available(type)).to.equal(true);

        token[type].ratereset = (Date.now() / 1000) + 10;
        assume(token.available(type)).to.equal(false);
      });
    });
  });
});
