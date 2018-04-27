'use strict';

/**
 * A representation of a single API/OAuth token.
 *
 * @constructor
 * @param {String} OAuth The OAuth token.
 * @param {String} prefix Authorization prefix.
 * @param {String[]} ratelimitTypes Types of rate limits to track.
 * @param {Object} options Optional options.
 * @api public
 */
function Token(OAuth, prefix, ratelimitTypes, options) {
  if (!this) return new Token(OAuth, prefix, ratelimitTypes, options);

  prefix = prefix || 'token ';
  options = options || {};

  options.timeout = 'timeout' in options ? options.timeout : 50;

  this.cooldown = false;

  this.ratelimitTypes = ratelimitTypes || ['headers', 'graphql'];
  this.ratelimitTypes.forEach(function(type) {
    this[type] = {
      remaining: Infinity,
      ratelimit: Infinity,
      ratereset: Infinity
    }
  }, this);

  this.timeout = options.timout;
  this.authorization = prefix + OAuth;
}

/**
 * Checks if the token is available for consumption.
 *
 * @returns {Boolean}
 * @api public
 */
Token.prototype.available = function available(limitType) {
  limitType = limitType || 'headers';
  var reset = this[limitType].ratereset >= 0 && (Date.now() >= (this[limitType].ratereset * 1000));

  //
  // We're in our cool down phase. We temporarily disable this token to ensure
  // that other tokens can be rolled in.
  //
  if (this.cooldown) {
    if ((this.cooldown + this.timeout) > Date.now()) return false;
    this.cooldown = false;
  }

  //
  // This token should be reset by the server, so we can attempt to reset the
  // `remaining` api calls to the original rate limit.
  //
  if (reset && this[limitType].ratelimit >= 0 && this[limitType].ratelimit !== Infinity) {
    this[limitType].remaining = this[limitType].ratelimit;
  }

  return this[limitType].ratelimit === Infinity    // First use, unknown state.
  || this[limitType].remaining > 0                 // We still tokens remaining.
  || reset;                             // Rate limit has reset.
};

/**
 * Token has been returned to the pool.
 *
 * @param {Mana} mana The mana instance that used the taken
 * @returns {Token}
 * @api public
 */
Token.prototype.returned = function returned(mana) {
  this.ratelimitTypes.forEach(function(type) {
    this[type].remaining = mana[type].remaining;
    this[type].ratereset = mana[type].ratereset;
    this[type].ratelimit = mana[type].ratelimit;
  }, this);

  this.cooldown = Date.now();

  return this;
};

//
// Expose the module.
//
module.exports = Token;
