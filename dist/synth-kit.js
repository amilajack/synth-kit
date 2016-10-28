(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.SynthKit = global.SynthKit || {})));
}(this, (function (exports) { 'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var window_1 = createCommonjsModule(function (module) {
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof commonjsGlobal !== "undefined") {
    module.exports = commonjsGlobal;
} else {
    module.exports = {};
}
});

var index = createCommonjsModule(function (module) {
var window = window_1;

var Context = window.AudioContext || window.webkitAudioContext;
if (Context) module.exports = new Context;
});

// Shim to make connect chainable (soon to be implemented native)
var proto = Object.getPrototypeOf(Object.getPrototypeOf(index.createGain()));
var _connect = proto.connect;
proto.connect = function () {
  _connect.apply(this, arguments);
  return this
};

/**
 * Get the audio context
 */
function context (ctx) { return ctx || index }

/**
 * Get the audio context of an audio node
 */
function contextOf (node) { return node ? context(node.context) : index }

/**
 * Get the audio context's destination
 */
function dest (context) { return (context || index).destination }

/**
 * Get audio context's current time
 */
function now (context) { return (context || index).currentTime }

/**
 * Get a valid time
 * @param {Float} time - the time (equal or greater than now(), otherwise, ignored)
 * @param {Float} delay - the delay
 * @param {AudioContext} context - (Optional) the audio context
 * @example
 * now() // => 0.7
 * time(0.2) // => 0.7
 * time(1) // => 1
 * time(0.2, 1) // => 1.7 (time is ignored because is < than now())
 */
function when (time, delay, ctx) {
  return Math.max(now(ctx), time || 0) + (delay || 0)
}

/**
 * Get time after n seconds (from now)
 * @function
 * @param {Float} delay - the delay
 * @param {AudioContext} context - (Optional) the audio context
 * @return {Float} time in seconds
 * @example
 * now() // => 0.785
 * after(1) // => 1.785
 */
var after = when.bind(0);

/**
 * Get audio context sampling rate
 * @param {AudioContext} context - (Optional) the audio context
 * @return {Integer} the context's sampling rate
 * @example
 * samplingRate() // => 44100
 */
function samplingRate (context) { return (context || index).sampleRate }

/**
 * Convert from seconds to samples (using AudioContext sampling rate)
 * @param {Float} seconds - the number of seconds
 * @param {AudioContext} context - (Optional) the audio context
 * @return {Integer} the number of samples
 * @example
 * white(seconds(1.2)) // => generate 1.2 seconds of white noise
 */
function seconds (secs, context) { return secs * samplingRate(context) }

// util
function fillStr (s, num) { return Array(num + 1).join(s) }
function isNum (x) { return typeof x === 'number' }
function isStr (x) { return typeof x === 'string' }
function isDef (x) { return typeof x !== 'undefined' }
function midiToFreq (midi, tuning) {
  return Math.pow(2, (midi - 69) / 12) * (tuning || 440)
}

var REGEX = /^([a-gA-G])(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)\s*$/;
/**
 * A regex for matching note strings in scientific notation.
 *
 * @name regex
 * @function
 * @return {RegExp} the regexp used to parse the note name
 *
 * The note string should have the form `letter[accidentals][octave][element]`
 * where:
 *
 * - letter: (Required) is a letter from A to G either upper or lower case
 * - accidentals: (Optional) can be one or more `b` (flats), `#` (sharps) or `x` (double sharps).
 * They can NOT be mixed.
 * - octave: (Optional) a positive or negative integer
 * - element: (Optional) additionally anything after the duration is considered to
 * be the element name (for example: 'C2 dorian')
 *
 * The executed regex contains (by array index):
 *
 * - 0: the complete string
 * - 1: the note letter
 * - 2: the optional accidentals
 * - 3: the optional octave
 * - 4: the rest of the string (trimmed)
 *
 * @example
 * var parser = require('note-parser')
 * parser.regex.exec('c#4')
 * // => ['c#4', 'c', '#', '4', '']
 * parser.regex.exec('c#4 major')
 * // => ['c#4major', 'c', '#', '4', 'major']
 * parser.regex().exec('CMaj7')
 * // => ['CMaj7', 'C', '', '', 'Maj7']
 */
function regex () { return REGEX }

var SEMITONES = [0, 2, 4, 5, 7, 9, 11];
/**
 * Parse a note name in scientific notation an return it's components,
 * and some numeric properties including midi number and frequency.
 *
 * @name parse
 * @function
 * @param {String} note - the note string to be parsed
 * @param {Boolean} isTonic - true the strings it's supposed to contain a note number
 * and some category (for example an scale: 'C# major'). It's false by default,
 * but when true, en extra tonicOf property is returned with the category ('major')
 * @param {Float} tunning - The frequency of A4 note to calculate frequencies.
 * By default it 440.
 * @return {Object} the parsed note name or null if not a valid note
 *
 * The parsed note name object will ALWAYS contains:
 * - letter: the uppercase letter of the note
 * - acc: the accidentals of the note (only sharps or flats)
 * - pc: the pitch class (letter + acc)
 * - step: s a numeric representation of the letter. It's an integer from 0 to 6
 * where 0 = C, 1 = D ... 6 = B
 * - alt: a numeric representation of the accidentals. 0 means no alteration,
 * positive numbers are for sharps and negative for flats
 * - chroma: a numeric representation of the pitch class. It's like midi for
 * pitch classes. 0 = C, 1 = C#, 2 = D ... 11 = B. Can be used to find enharmonics
 * since, for example, chroma of 'Cb' and 'B' are both 11
 *
 * If the note has octave, the parser object will contain:
 * - oct: the octave number (as integer)
 * - midi: the midi number
 * - freq: the frequency (using tuning parameter as base)
 *
 * If the parameter `isTonic` is set to true, the parsed object will contain:
 * - tonicOf: the rest of the string that follows note name (left and right trimmed)
 *
 * @example
 * var parse = require('note-parser').parse
 * parse('Cb4')
 * // => { letter: 'C', acc: 'b', pc: 'Cb', step: 0, alt: -1, chroma: -1,
 *         oct: 4, midi: 59, freq: 246.94165062806206 }
 * // if no octave, no midi, no freq
 * parse('fx')
 * // => { letter: 'F', acc: '##', pc: 'F##', step: 3, alt: 2, chroma: 7 })
 */
function parse (str, isTonic, tuning) {
  if (typeof str !== 'string') return null
  var m = REGEX.exec(str);
  if (!m || !isTonic && m[4]) return null

  var p = { letter: m[1].toUpperCase(), acc: m[2].replace(/x/g, '##') };
  p.pc = p.letter + p.acc;
  p.step = (p.letter.charCodeAt(0) + 3) % 7;
  p.alt = p.acc[0] === 'b' ? -p.acc.length : p.acc.length;
  var pos = SEMITONES[p.step] + p.alt;
  p.chroma = pos < 0 ? 12 + pos : pos % 12;
  if (m[3]) { // has octave
    p.oct = +m[3];
    p.midi = pos + 12 * (p.oct + 1);
    p.freq = midiToFreq(p.midi, tuning);
  }
  if (isTonic) p.tonicOf = m[4];
  return p
}

var LETTERS = 'CDEFGAB';
function acc (n) { return !isNum(n) ? '' : n < 0 ? fillStr('b', -n) : fillStr('#', n) }
function oct (n) { return !isNum(n) ? '' : '' + n }

/**
 * Create a string from a parsed object or `step, alteration, octave` parameters
 * @param {Object} obj - the parsed data object
 * @return {String} a note string or null if not valid parameters
 * @since 1.2
 * @example
 * parser.build(parser.parse('cb2')) // => 'Cb2'
 *
 * @example
 * // it accepts (step, alteration, octave) parameters:
 * parser.build(3) // => 'F'
 * parser.build(3, -1) // => 'Fb'
 * parser.build(3, -1, 4) // => 'Fb4'
 */
function build (s, a, o) {
  if (s === null || typeof s === 'undefined') return null
  if (s.step) return build(s.step, s.alt, s.oct)
  if (s < 0 || s > 6) return null
  return LETTERS.charAt(s) + acc(a) + oct(o)
}

/**
 * Get midi of a note
 *
 * @name midi
 * @function
 * @param {String|Integer} note - the note name or midi number
 * @return {Integer} the midi number of the note or null if not a valid note
 * or the note does NOT contains octave
 * @example
 * var parser = require('note-parser')
 * parser.midi('A4') // => 69
 * parser.midi('A') // => null
 * @example
 * // midi numbers are bypassed (even as strings)
 * parser.midi(60) // => 60
 * parser.midi('60') // => 60
 */
function midi (note) {
  if ((isNum(note) || isStr(note)) && note >= 0 && note < 128) return +note
  var p = parse(note);
  return p && isDef(p.midi) ? p.midi : null
}

/**
 * Get freq of a note in hertzs (in a well tempered 440Hz A4)
 *
 * @name freq
 * @function
 * @param {String} note - the note name or note midi number
 * @param {String} tuning - (Optional) the A4 frequency (440 by default)
 * @return {Float} the freq of the number if hertzs or null if not valid note
 * @example
 * var parser = require('note-parser')
 * parser.freq('A4') // => 440
 * parser.freq('A') // => null
 * @example
 * // can change tuning (440 by default)
 * parser.freq('A4', 444) // => 444
 * parser.freq('A3', 444) // => 222
 * @example
 * // it accepts midi numbers (as numbers and as strings)
 * parser.freq(69) // => 440
 * parser.freq('69', 442) // => 442
 */
function freq (note, tuning) {
  var m = midi(note);
  return m === null ? null : midiToFreq(m, tuning)
}

var parser = { parse: parse, build: build, regex: regex, midi: midi, freq: freq };
// add additional functions, one for each object property
var FNS = ['letter', 'acc', 'pc', 'step', 'alt', 'chroma', 'oct'];
FNS.forEach(function (name) {
  parser[name] = function (src) {
    var p = parse(src);
    return p && isDef(p[name]) ? p[name] : null
  };
});

var index$1 = parser;

function isNum$1 (n) { return typeof n === 'number' }
function isFn (x) { return typeof x === 'function' }
function isStr$1 (x) { return typeof x === 'string' }
function isObj (x) { return typeof x === 'object' }

// CONVERSION
// ==========

/**
 * Plug something (a value, a node) into a node parameter
 */
function plug (name, value, node) {
  if (typeof value === 'undefined') {
    // do nothing
  } else if (typeof value.connect === 'function') {
    node[name].value = 0;
    value.connect(node[name]);
    return value
  } else if (node[name]) {
    node[name].value = value;
  }
}

// TODO: export?
// Get time for a given `when` and  `delay` parameters
function toTime (context, when, delay) {
  return Math.max(context.currentTime, when || 0) + (delay || 0)
}

function bindLifecycle (node) {
  return {
    connect: node.connect ? node.connect.bind(node) : null,
    disconnect: node.disconnect ? node.disconnect.bind(node) : null,
    start: node.start ? node.start.bind(node) : null,
    stop: node.stop ? node.stop.bind(node) : null
  }
}

function dispatch (event, value, node, dependents) {
  if (node[event]) node[event](value);
  dependents.forEach(function (dep) {
    if (dep && dep[event]) dep[event](value);
  });
  return node
}

/**
 * Override node functions to handle better the node's lifecycle
 */
function lifecycle (node, dependents) {
  // TODO: possible optimization: if dependents is empty, no need to decorate
  var raw = bindLifecycle(node);

  node.connected = false;
  node.disconnect = function () {
    node.connected = false;
    dispatch('disconnect', null, raw, dependents);
  };
  node.start = function (when, delay, duration) {
    var time = toTime(node.context, when, delay);
    // if (!node.connected) node.connect(node.context.destination)
    dispatch('start', time, raw, dependents);
    if (duration) node.stop(time + duration);
    return node
  };
  node.stop = function (when, delay) {
    var time = toTime(node.context, when, delay);
    dispatch('stop', time, raw, dependents);
  };
  return node
}

/**
 * Convert from beats per minute to hertzs
 * @param {Integer} bpm - the tempo
 * @param {Integer} sub - (Optional) subdivision (default 1)
 * @return {Float} the tempo expressed in hertzs
 */
function tempo (bpm, sub) { return (bpm / 60) * (sub || 1) }

/**
 * Get frequency of a note. The note can be a note name in scientific
 * notation (for example: 'C#2') or a midi number
 */
function note (name, base) {
  return index$1.freq(name)
}

function hz (value, base) {
  if (isStr$1(value)) {
    base = base || 440;
    return Math.pow(2, (+value - 69) / 12) * base
  } else {
    return Math.abs(+value)
  }
}

/**
 *  Convert decibels into gain.
 *  @param  {Number} db
 *  @return {Number} the gain (from 0 to 1)
 */
function dB (db) { return Math.pow(2, db / 6) }

/**
 *  Convert gain to decibels.
 *  @param  {Number} gain (0-1)
 *  @return {Decibels}
 */
function gainToDb (gain) { return 20 * (Math.log(gain) / Math.LN10) }

/* global XMLHttpRequest */

/**
 * Load a remote audio file.
 * @param {String} url
 * @param {AudioContext} context - (Optional)
 * @return {Promise<AudioBuffer>} a promise that resolves to an AudioBuffer
 */
function load (url, ac) {
  return fetch(url, 'arraybuffer').then(decodeAudio(ac))
}

/**
 * Fetch url
 * @param {String} url - the url
 * @param {String} type - can be 'text' or 'arraybuffer'
 * @return {Promise} a promise to the result
 */
function fetch (url, type) {
  type = type === 'arraybuffer' ? type : 'text';
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.responseType = type;

    xhr.onload = function () {
      if (xhr.response) {
        resolve(xhr.response);
      }
    };
    xhr.onerror = reject;

    xhr.send();
  })
}

function decodeAudio (ac, arrayBuffer) {
  if (arguments.length === 1) return function (array) { return decodeAudio(ac, array) }
  return new Promise(function (resolve, reject) {
    ac.decodeAudioData(arrayBuffer, resolve, reject);
  })
}

var slice = Array.prototype.slice;
var isArray = Array.isArray;

// ROUTING
// =======
/**
 * Connect nodes in series: A -> B -> C -> D
 * @param {Array<AudioNode>} nodes - the list of nodes to be connected
 * @return {AudioNode} the resulting audio node
 */
function connect (nodes) {
  nodes = isArray(nodes) ? nodes : slice.call(arguments);
  if (!nodes.length) return null
  else if (nodes.length === 1) return nodes[0]

  var first = nodes[0];
  var last = nodes.reduce(function (src, dest$$1) {
    src.connect(dest$$1);
    return dest$$1
  });
  first.connect = last.connect.bind(last);
  return lifecycle(first, nodes.slice(1))
}

/**
 * Connect nodes in parallel in order to add signals. This is one of the
 * routing functions (the other is `connect`).
 * @param {...AudioNode} nodes - the nodes to be connected
 * @return {AudioNode} the resulting audio node
 * @example
 * add(sine(400), sine(401)).start()
 */
function add (nodes) {
  nodes = isArray(nodes) ? nodes : slice.call(arguments);
  if (!nodes.length) return null
  else if (nodes.length === 1) return nodes[0]

  var context$$1 = nodes[0].context;
  var input = context$$1.createGain();
  var output = context$$1.createGain();
  nodes.forEach(function (node) {
    if (node.numberOfInputs) input.connect(node);
    node.connect(output);
  });
  input.connect = output.connect.bind(output);
  return lifecycle(input, nodes)
}

// SIGNALS
// =======

/**
 * Create a constant signal. Normally you will use it in combination with
 * envelopes or modulators.
 *
 * @param {Integer} value - the value of the constant
 * @param {AudioContext} context - (Optional) the audio context
 * @return {AudioNode} the constant audio node
 * @example
 * sine(constant(440)).start()
 */
function constant (value, ac) {
  // TODO: cache buffer
  var ctx = context(ac);
  var source = ctx.createBufferSource();
  source.loop = true;
  source.buffer = ctx.createBuffer(1, 2, ctx.sampleRate);
  var data = source.buffer.getChannelData(0);
  data[0] = data[1] = value;
  return source
}

/**
 * Create a signal source. You will use signals to change parameters of a
 * audio node after starting. See example.
 * @param {Integer} value - the value of the constant
 * @param {AudioContext} context - (Optional) the audio context
 * @return {AudioParam} the constant audio node
 * @example
 * var freq = signal(440)
 * sine(freq).start()
 * freq.value.linearRampToValueAtTime(880, after(5))
 */
function signal (value, ac) {
  var mod = context(ac).createGain();
  mod.gain.value = value;
  var signal = connect(constant(1), mod);
  signal.value = mod.gain;
  signal.start();
  return signal
}

/**
 * Create a node that bypasses the signal
 * @param {AudioContext} context - (Optional) the audio context
 * @return {AudioNode} the bypass audio node
 * @example
 * connect(sine(300), add(bypass(), dly(0.2)))
 */
function bypass (ac) {
  return context(ac).createGain()
}

/**
 * Create a gain node
 * @param {Float|AudioNode} gain - the gain value or modulator
 * @param {AudioContext} context - (Optional) the audio context
 * @return {AudioNode} the gain node
 * @example
 * connect(sine(440), gain(0.3))
 * @example
 * // with modulation (kind of tremolo)
 * connect(sine(400), gain(sine(10)))
 */
function gain (gain, ac) {
  var amp = context(ac).createGain();
  return lifecycle(amp, [
    plug('gain', gain, amp)
  ])
}

/**
 * Multiply a signal.
 * @param {Integer|AudioNode} value - the value
 * @param {AudioNode} signal - the signal to multiply by
 * @example
 * // a vibrato effect
 * sine(440, mult(500, sine(tempo(160))))
 */
function mult (value, signal) {
  return connect(signal, gain(value))
}

/**
 * Scale a signal. Given a signal (between -1 and 1) scale it to fit in a range.
 * @param {Integer} min - the minimum of the range
 * @param {Integer} max - the minimum of the range
 * @param {AudioNode} signal - the signal to scale
 * @param {AudioContext} context - the optional audio context
 * @return {AudioNode} the scaled signal node
 * @example
 * // create a frequency envelope between 440 and 880 Hz
 * sine(scale(440, 880, adsr(0.1, 0.01, 1, 1)))
 */
function scale (min, max, source, ctx) {
  if (source.numberOfInputs) source = connect(constant(1, ctx), source);
  var delta = max - min;
  return add(constant(min, ctx), mult(delta, source))
}

// OSCILLATORS
// ===========

/**
 * Create an OscillatorNode
 * @param {String} type - one of OscillatorNode [types]()
 * @param {Float|AudioNode} - the frequency (can be a number or a signal)
 * @param {Float|AudioNode} - the detune in cents (can be a number or a signal)
 * @param {AudioContext} context - the optional audio context
 * @return {AudioNode} the oscillator
 * @example
 * osc('sine', 880)
 * osc('sawtooth', 1600, mult(50, sine(5)))
 */
function osc (type, frequency, detune, ac) {
  var osc = context(ac).createOscillator();
  osc.type = type || 'sine';
  return lifecycle(osc, [
    plug('frequency', frequency, osc),
    plug('detune', detune, osc)
  ])
}
/**
 * Create a sine oscillator. An alias for `osc('sine', ...)`
 * @function
 * @see osc
 * @param {Float|AudioNode} - the frequency (can be a number or a signal)
 * @param {Float|AudioNode} - the detune in cents (can be a number or a signal)
 * @param {AudioContext} context - the optional audio context
 * @return {AudioNode} the oscillator
 * @example
 * sine(1760)
 */
const sine = osc.bind(null, 'sine');
/**
 * Create a sawtooth oscillator. An alias for `osc('sawtooth', ...)`
 * @function
 * @see osc
 * @param {Float|AudioNode} - the frequency (can be a number or a signal)
 * @param {Float|AudioNode} - the detune in cents (can be a number or a signal)
 * @param {AudioContext} context - the optional audio context
 * @return {AudioNode} the oscillator
 * @example
 * saw(1760)
 */
const saw = osc.bind(null, 'sawtooth');
/**
 * Create a square oscillator. An alias for `osc('square', ...)`
 * @function
 * @see osc
 * @param {Float|AudioNode} - the frequency (can be a number or a signal)
 * @param {Float|AudioNode} - the detune in cents (can be a number or a signal)
 * @param {AudioContext} context - the optional audio context
 * @return {AudioNode} the oscillator
 * @example
 * square(1760)
 */
const square = osc.bind(null, 'square');
/**
 * Create a triangle oscillator. An alias for `osc('triangle', ...)`
 * @function
 * @see osc
 * @param {Float|AudioNode} - the frequency (can be a number or a signal)
 * @param {Float|AudioNode} - the detune in cents (can be a number or a signal)
 * @param {AudioContext} context - the optional audio context
 * @return {AudioNode} the oscillator
 * @example
 * triangle(1760)
 */
const triangle = osc.bind(null, 'triangle');

/**
 * Create an oscillator bank. It returns a signal composed of the sum of the
 * individual oscillators.
 *
 * The idea is provide a collection of frequencies and map them to oscillators.
 * The frequencies can be expressed with an array of frequencies or with a
 * base frequency and an array of relative numbers. Types can be a single value
 * for all oscillators, or a list. Finally an optional list of gains is admitted.
 *
 * @param {Float} base - the base frequency. Can be null
 * @param {Array<Float>} frequencies - an array with the frequencies
 * @param {Array<String>} types - the array of types
 * @param {Array<Number>} gains - the array of gains
 * @param {AudioContext} context - the optional audio context
 * @return {AudioNode}
 *
 * @example
 * // create three sines with unrelated frequencies:
 * oscBank(null, [1345.387, 435.392, 899.432], 'sine')
 * // create three sawtooth with related frequencies:
 * oscBank(440, [ 1, 2, 2.4 ], 'sawtooth')
 * // different types
 * oscBank(null, [400, 600], ['square', 'sawtooth'])
 * // specify gains
 * oscBank(null, [440, 660], 'sine', [0.6, 0.2])
 */
function oscBank (base, freqs, types, gains, ac) {
  var g, src;
  if (!isNum$1(base)) base = 1;
  if (!isArray(freqs)) freqs = [ 1 ];
  if (!isArray(gains)) gains = [ 1 ];
  if (!isArray(types)) types = [ 'sine' ];

  var tl = types.length;
  var gl = gains.length;
  return connect(add(freqs.map(function (freq, i) {
    src = osc(types[i % tl], base * freq);
    g = gains[i % gl];
    return g === 1 ? src : connect(src, gain(g))
  })), gain(1 / freqs.length))
}

// FILTERS
// =======

/**
 * Create a filter (a [BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode))
 * @param {String} type - the filter [type](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type)
 * @param {Number|AudioNode} frequency - the frequency in hertzs (can be a number or a signal)
 * @param {Number|AudioNode} Q - the Q of the filter (can be a number or a signal)
 * @param {Number|AudioNode} detune - the detune in cents (can be a number or a signal)
 * @param {AudioContext} context - the optional audio context
 * @return {AudioNode} the filter
 * @example
 * connect(square(800), filter('lowpass', 400))
 */
function filter (type, frequency, Q, detune, ac) {
  var filter = context(ac).createBiquadFilter();
  filter.type = type;
  return lifecycle(filter, [
    plug('frequency', frequency, filter),
    plug('Q', Q, filter),
    plug('detune', detune, filter)
  ])
}
const lowpass = filter.bind(null, 'lowpass');
const hipass = filter.bind(null, 'highpass');
const bandpass = filter.bind(null, 'hipass');

// MODULATORS
// ==========

/**
 * Detune modulator. Can be connected to any `detune` param.
 * Basically is a boilerplate code reductor.
 * @param {Integer} cents - how much
 * @param {Integer|AudioNode} modulator - The modulator. If it's a number,
 * is the frequency of a sine oscillator.
 * @param {AudioContext} context - the optional audio context
 * @example
 * sine(300, detune(200, adshr(0.1, 0.2, 0.5, 1))))
 * sine(300, detune(50, tempo(20)))
 */
function detune (cents, mod, ac) {
  if (!isNum$1(cents)) cents = 50;
  if (isNum$1(mod)) mod = sine(mod, ac);
  return mult(cents, mod)
}

/**
 * Get a remote audio sample. You get a function that returns an AudioBuffer
 * when loaded or null otherwise. Or you can chain like a promise.
 *
 * @param {String} url - the url of the file
 * @param {AudioContext} context - (Optional) the audio context
 * @return {Function} a function the returns the buffer
 * @example
 * source(sample('server.com/audio-file.mp3')).start()
 * @example
 * // use the Promise like interface
 * sample('audio-file.mp3').then(function (buffer) {
 *     source(buffer).start()
 * })
 */


/**
 * Create a buffer source node.
 * @param {Buffer|Function} buffer - the buffer (or a function that returns a buffer)
 * @param {Boolean} loop - (Optional) loop the buffer or not (defaults to false)
 * @param {Integer|Node} detune - (Optional) the detune value or modulator
 * @param {AudioContext} context - (Optional) the audio context
 * @return {AudioNode} BufferSourceNode
 */
function source (buffer, loop, detune, ac) {
  var src = context(ac).createBufferSource();
  src.buffer = isFn(buffer) ? buffer() : buffer;
  if (!src.buffer) console.warn('Buffer not ready.');
  src.loop = loop;
  return lifecycle(src, [
    plug('detune', detune, src)
  ])
}

/**
 * Generate a BufferNode. It returns a no-parameter function that
 * returns a buffer. This way, it's easy to memoize (cache) buffers.
 *
 * @param {Function|Array<Function>} generators - a generator or a list of
 * generators (to create a buffer with multiple channels)
 * @param {Integer} samples - the length in samples
 * @param {Boolean} reverse - (Optional) true if you want the buffer reversed
 * @return {Function} a function with no parameters that returns the desired buffer
 */
function generate (generators, samples, reverse, ac) {
  return function () {
    if (!Array.isArray(generators)) generators = [ generators ];
    samples = samples || 0;
    reverse = reverse === true;
    var numOfChannels = generators.length;

    var buffer = context(ac).createBuffer(numOfChannels, samples, samplingRate(ac));
    for (var ch = 0; ch < numOfChannels; ch++) {
      generateData(generators[ch], buffer.getChannelData(ch), samples, reverse);
    }
    return buffer
  }
}

function generateData (generator, data, samples, reverse) {
  for (var i = 0; i < samples; i++) {
    data[i] = generator(reverse ? samples - i : i);
  }
}

/**
 * White noise source node.
 * @param {Integer} length - lenth in samples
 * @param {Boolean} loop - (Optional) infinite duration
 * @param {AudioContext} context - (Optional) audio context
 * @return {AudioNode} the white noise audio node generator
 * @example
 * connect(white(seconds(1)), perc(), dest()).start()
 */
function white (samples, loop, ac) {
  if (!isNum$1(samples)) samples = samplingRate(ac);
  loop = loop !== false;
  return source(generate(whiteGen, samples, false, ac), loop, 0, ac)
}
function whiteGen () { return Math.random() * 2 - 1 }

function schedule (param, shape, times, types, ac) {
  return function (when$$1, delay) {
    console.log(shape, times, types);
    var type;
    var time = toTime(context, when$$1, delay);
    var lt = times.length;
    var tp = types.length;
    shape.forEach(function (value, i) {
      time += times[i % lt];
      type = types[i % tp];
      console.log(value, time, type);
      if (type === 'set') param.setValueAtTime(value, time);
      else if (type === 'exp') param.exponentialRampToValueAtTime(value === 0 ? 0.00001 : value, time);
      else param.linearRampToValueAtTime(value, time);
    });
  }
}

function env (shape, times, types, ac) {
  var ctx = context(ac);
  var gain$$1 = ctx.createGain();
  gain$$1.gain.value = 0;
  gain$$1.start = schedule(gain$$1.gain, shape, times, types, ctx);
  return gain$$1
}

function toNum (num, def) { return isNum$1(num) ? num : def }
/**
 * An attack-decay-sustain-(hold)-decay envelope
 */
function adshr (attack, decay, sustain, hold, release, ac) {
  attack = toNum(attack, 0.01);
  decay = toNum(decay, 0.1);
  sustain = toNum(sustain, 1);
  hold = toNum(hold, 0);
  release = toNum(release, 0.3);
  return env([0, 1, sustain, sustain, 0],
    [0, attack, decay, hold, release],
    ['set', 'lin', 'set', 'exp'], ac)
}

/**
 * An attack-decay envelope
 */
function perc (attack, decay, ac) {
  return adshr(attack, 0, 1, 0, decay, ac)
}

/**
 * A frequency envelope. Basically the setup to provide an adsr over a
 * number of octaves.
 * @param {Number} frequency - the initial frequency
 * @param {Number} octaves - (Optional) the number of octaves of the envelope (1 by default)
 * @param {Number} attack - (Optional) the attack length in seconds
 * @param {Number} decay - (Optional) the decay length in seconds
 * @param {Number} sustain - (Optional) the sustain gain (from 0 to 1)
 * @param {Number} release - (Optional) the release length in seconds
 * @param {AudioContext} context - the optional audio context
 */
function freqEnv (freq, octs, a, d, s, r, ac) {
  // TODO: use adsr
  return scale(freq, freq * Math.pow(2, octs), adshr(a, d, s, 0, r, ac))
}

function mix (wet, fx) {
  if (!isNum$1(wet)) wet = 0.5;
  return add(gain(1 - 0.5), connect(fx, gain(wet)))
}

function bus (fx) {
  return function (wet) { return mix(wet, fx) }
}

/**
 * Create a feedback loop.
 * @param {Integer} amount - the amount of signal
 * @param {AudioNode} node - the node to feedback
 * @param {AudioNode} ret - (Optional) the return fx
 * @param {AudioContext} context - (Optional) the audio context
 */
function feedback (amount, signal$$1, fx, ac) {
  fx = fx || bypass(ac);
  var feed = gain(amount, ac);
  connect(fx, signal$$1, feed);
  feed.connect(fx);
  return signal$$1
}

function tremolo (rate, type, ac) {
  type = type || 'sine';
  return gain(osc(type, rate, ac), ac)
}

function dly (time, ac) {
  var dly = context(ac).createDelay(5);
  return lifecycle(dly, [
    plug('delayTime', time, dly)
  ])
}

function delay (time, filter$$1, feedAmount, ac) {
  if (!isNum$1(feedAmount)) feedAmount = 0.3;
  filter$$1 = isNum$1(filter$$1) ? lowpass(filter$$1, null, null, ac) : filter$$1 || bypass(ac);
  return feedback(feedAmount, dly(time, ac), filter$$1, ac)
}

var slice$1 = Array.prototype.slice;

/**
 * Decorate a function to receive a options object. This decoration ensures that
 * the function always receive an options object. It also perform some other
 * goodies like convert from note names to frequencies, provide a context
 * option with the AudioContext or wrap notes into { frequency: ... } object.
 *
 * The possible values of the config object are:
 *
 * - defaults: If provided, the defaults object will be merged with the options
 * - toOptions: a function that is called if the given parameter is not an
 * options configuration. If not provided, by default it will put the parameter
 * as the frequency of the options (see example)
 *
 * @param {Function} synth - the synth function (a function that returns a
 * graph of audio nodes)
 * @param {Object} config - the configuration
 * @return {Function} a decorated synth function
 * @example
 * var synth = withOptions(function (o) {
 *    return connect(sine(o.frequency),
 *      filter(o.filter.type, o.filter.frequency || o.frequency))
 * }, {
 *  defaults: { frequency: 440, filter: { type: 'lowpass' } }
 * })
 * // It will convert note names into frequencies automatically
 * synth({ frequency: 'A4' })
 * // By default will convert note names to { frequency: <freq of note> }
 * synth('A4') // equivalent to: synth({ frequency: 440 })
 */
function withOptions (fn, config) {
  config = config || {};
  config.toOptions = config.toOptions || freqAndContextToOpts;
  return function (options) {
    if (!isObj(options)) options = config.toOptions.apply(null, arguments);
    return fn(Object.assign({}, config.defaults, options))
  }
}
function freqAndContextToOpts (frequency, context$$1) {
  return { frequency: frequency, context: context$$1 }
}

/**
 * A master output instrument. You can use it to start and stop nodes. All
 * started nodes will be connected to the AudioContext destination.
 *
 * @example
 * master.start(sine(300)) // connect to destination and start
 * master.start(sine(600), 0, 1) // connect to destination and start after 1 second
 * master.stop() // stop all
 */
var master = inst(null, dest());

/**
 * Create an object-oriented-style instrument player. It wraps a synth function
 * (a function that create nodes) into in a convenient player API. It can
 * be used to limit the polyphony.
 *
 * The player object have the following methods:
 *
 * - `start(node, when, delay, duration)`: start a node
 * - `stop`: stop all nodes
 * - `on(event, callback)`: add an event callback
 * - `trigger(event, ...values)`: make the player trigger an event
 *
 *
 * @param {Function} synth - the synth function (a function that returns a node graph)
 * @param {AudioNode} destination - if present, all nodes will be connected to
 * this destination
 * @param {Integer} maxVoices - (Optional) the maximum number of simultaneous
 * voices (0 means no limit, defaults to 0)
 * @return {Player} a player object
 *
 * @example
 * // an instrument with destination
 * var synth = inst((fq) => sine(fq), dest())
 * synth.start('A4')
 * synth.stopAll()
 * @example
 * // only the destination
 * var master = inst(null, connect(mix(0.2), reverb(), dest()))
 * master.start(sine(300))
 * master.start(sine(400))
 * master.stopAll()
 */
function inst (synth, destination, maxVoices) {
  var i = {};
  var voices = initVoices(maxVoices);
  i.start = function (value, time, delay, duration) {
    var node = isFn(synth) ? synth(value) : value;
    if (destination) node.connect(destination);

    trackNode(voices, node);
    time = when(time, delay, contextOf(destination));
    node.start(time);
    if (duration) node.stop(time + duration);
    return node
  };
  i.track = trackNode.bind(null, voices);
  i.stop = function () { return stopAll(voices) };
  i.inst = function (synth, maxVoices) { return inst(synth, destination, maxVoices) };
  i.on = on.bind(null, i);
  i.trigger = trigger.bind(null, i);
  return i
}

// init a voices data object
function initVoices (limit) {
  limit = limit || 0;
  return { limit: limit, all: {}, nextId: 0, current: 0, pool: new Array(limit) }
}

// add a given node to the voices data object
function trackNode (voices, node) {
  node.id = voices.nextId++;
  voices.all[node.id] = node;
  on(node, 'ready', function (_, name) {
    console.log('Instrument ready:', name);
  });
  return node
}

// stop all voices from the voices data object
function stopAll (voices) {
  Object.keys(voices.all).forEach(function (id) {
    voices.all[id].stop();
  });
}

// add a listener to a target
function on (target, event, callback) {
  if (!event || event === '*') event = 'event';
  var prev = target['on' + event];
  target['on' + event] = function () {
    if (prev) prev.apply(null, arguments);
    callback.apply(null, arguments);
  };
}

// trigger an event
function trigger (target, event /*, ...values */) {
  if (!isFn(target['on' + event])) return
  var args = slice$1.call(arguments, 2);
  target['on' + event].apply(null, args);
  if (isFn(target.onevent)) target.onevent.apply(null, args);
}

exports.context = context;
exports.now = now;
exports.dest = dest;
exports.samplingRate = samplingRate;
exports.seconds = seconds;
exports.tempo = tempo;
exports.note = note;
exports.hz = hz;
exports.dB = dB;
exports.gainToDb = gainToDb;
exports.load = load;
exports.decodeAudio = decodeAudio;
exports.fetch = fetch;
exports.connect = connect;
exports.add = add;
exports.constant = constant;
exports.bypass = bypass;
exports.gain = gain;
exports.signal = signal;
exports.mult = mult;
exports.scale = scale;
exports.osc = osc;
exports.sine = sine;
exports.saw = saw;
exports.square = square;
exports.triangle = triangle;
exports.oscBank = oscBank;
exports.filter = filter;
exports.lowpass = lowpass;
exports.hipass = hipass;
exports.bandpass = bandpass;
exports.detune = detune;
exports.generate = generate;
exports.source = source;
exports.white = white;
exports.adshr = adshr;
exports.perc = perc;
exports.freqEnv = freqEnv;
exports.mix = mix;
exports.bus = bus;
exports.feedback = feedback;
exports.tremolo = tremolo;
exports.dly = dly;
exports.delay = delay;
exports.inst = inst;
exports.master = master;
exports.withOptions = withOptions;

Object.defineProperty(exports, '__esModule', { value: true });

})));
