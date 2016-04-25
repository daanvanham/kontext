/*global Attribute: true, Emission: true, Observer: true, Settings: true, Text: true*/
/*
 *       __    Kontext (version $DEV$ - $DATE$)
 *      /\_\
 *   /\/ / /   Copyright 2015-2016, Konfirm (Rogier Spieker <rogier+kontext@konfirm.eu>)
 *   \  / /    Released under the GPL-2.0 license
 *    \/_/     More information: http://konfirm.net/kontext
 *
 *  $CONTRIBUTORS$
 */
;(function(global) {
	'use strict';

	//@buildinfo

	//  load dependencies
	//@include lib/settings
	//@include lib/emission
	//@include lib/observer
	//@include lib/text
	//@include lib/attribute

	/**
	 *  Kontext module
	 *  @name     Kontext
	 *  @package  Kontext
	 *  @return   Object Kontext
	 */
	function Kontext() {
		var kontext = this,
			settings = new Settings(),
			emission = new Emission(),
			observer = new Observer();


		/**
		 *  Verify the target contains specific properties
		 *  @name    contains
		 *  @access  internal
		 *  @param   Object  target
		 *  @param   Array   list
		 *  @param   number  minimum matches  [optional, default undefined - must contain all in list]
		 *  @return  bool    contains
		 */
		function contains(target, list, min) {
			var keys = [].concat(list),
				match = keys.filter(function(key) {
					return target && key in target;
				});

			return match.length >= (min ? min : keys.length);
		}

		/**
		 *  Basic compatibility check
		 *  @name    compatible
		 *  @access  internal
		 *  @return  void
		 */
		function compatible() {
			return contains(document, 'addEventListener') &&
				contains(Object, ['defineProperties', 'getOwnPropertyDescriptor']);
		}

		/**
		 *  Initializer, set up Kontext defaults
		 *  @name    init
		 *  @access  internal
		 *  @return  void
		 */
		function init() {
			/* istanbul ignore next */
			if (!compatible()) {
				return setTimeout(function() {
					emission.trigger('ready', ['Unsupported browser']);
				}, 0);
			}

			//  internal settings
			settings._({
				rAF: global.requestAnimationFrame || function(f) {
					setTimeout(f, 1e3 / 60);
				}
			});

			//  public settings (this is what is provided/changed when using the kontext.defaults method)
			settings.public({
				greedy: true,
				abbreviateExtensions: true,
				attribute: 'data-kontext',
				pattern: /(\{(\$?[a-z_]+[\.-]?(?:[a-z0-9_]+[\.-]?)*)(?::([^\}]+))?\})/i
			});

			//  register our own ready handler, ensuring to be the first in line
			emission.add('ready', function(error) {
				settings._('ready', error || true);
			}, 1);

			//  add the DOMContentLoaded event to the document,
			//  so we can trigger the 'ready' handlers early on
			document.addEventListener('DOMContentLoaded', function() {
				//  call any registered 'ready' handler
				emission.trigger('ready', [undefined, kontext]);
			}, false);
		}

		/**
		 *  Iterator over all properties and apply the callback function on each
		 *  @name    eachKey
		 *  @access  internal
		 *  @param   object    target
		 *  @param   function  callback
		 *  @return  void
		 */
		function eachKey(target, fn) {
			Object.keys(target).forEach(function(key, index) {
				fn(key, target[key], index);
			});
		}

		/**
		 *  Convert given array-like value to be a true array
		 *  @name    castToArray
		 *  @access  internal
		 *  @param   Array-like  value
		 *  @return  Array  value  [if given value cannot be cast to an array, null is returned]
		 */
		function castToArray(cast) {
			return cast && cast.length ? Array.prototype.slice.call(cast) : null;
		}

		/**
		 *  Convenience function to define a property
		 *  @name    define
		 *  @access  internal
		 *  @param   object  target
		 *  @param   string  key
		 *  @param   bool    expose
		 *  @param   mixed   getter
		 *  @param   mixed   setter  [optional, default undefined - no setter]
		 *  @return  void
		 */
		function define(target, key, expose, getter, setter) {
			var definition = {enumerable: expose};

			//  if the setter is a boolean value, there will be no getter/setter function but a value
			//  the boolean value in setter indicates whether the value is writable
			if (typeof setter === 'boolean') {
				definition.writable = setter;
				definition.value = getter;
			}
			else {
				definition.get = getter;
				definition.set = setter;
			}

			Object.defineProperty(target, key, definition);
		}

		/**
		 *  Obtain an extension which is only capable of logging an error
		 *  @name    extensionError
		 *  @access  internal
		 *  @param   string    message  ['%s' will be replaced with additional argument values]
		 *  @param   string    replacement
		 *  @return  function  handler
		 */
		function extensionError() {
			var arg = castToArray(arguments),
				error = arg.reduce(function(prev, current) {
					return prev.replace('%s', current);
				});

			return function() {
				console.error('Kontext: ' + error);
			};
		}

		/**
		 *  Find all extensions of which the first characters match given name
		 *  @name    abbreviateExtension
		 *  @access  internal
		 *  @param   string    name
		 *  @param   object    extensions
		 *  @return  function  handler
		 */
		function abbreviateExtension(name, ext) {
			var list = Object.keys(ext)
					.filter(function(key) {
						return name === key.substr(0, name.length);
					}).sort();

			//  if multiple extensions match, we do not try to find the intended one, but log
			//  an error instead
			if (list.length > 1) {
				return extensionError('Multiple extensions match "%s": %s', name, list);
			}

			return list.length ? ext[list[0]] : null;
		}

		/**
		 *  Obtain and/or register an extension to be defined in the data attribute
		 *  @name    extension
		 *  @access  internal
		 *  @param   string    name
		 *  @param   function  handler  [optional, default undefined - obtain the extension]
		 *  @return  function  handler
		 */
		function extension(name, handler) {
			var ext = settings._('extension') || {},
				abbreviated;

			//  if a handler is provided, update the registered extension to add/overwrite the handler
			//  to be used for given name
			if (handler) {
				ext[name] = handler;
				settings._('extension', ext);
			}

			//  if the name does not represent a registered extension, we will not be showing an error
			//  immediately but instead return a function which triggers an error upon use
			//  this should ensure Kontext to fully function and deliver more helpful error messages to
			//  the developer
			if (!(name in ext)) {
				abbreviated = settings.public('abbreviateExtensions') ? abbreviateExtension(name, ext) : null;

				return abbreviated || extensionError(
					'Unknown extension "%s"',
					name
				);
			}

			return ext[name];
		}

		/**
		 *  Add the on/off methods and emission the emission object
		 *  @name    emitable
		 *  @access  internal
		 *  @param   object  model
		 *  @return  object  Emission
		 */
		function emitable(model) {
			var result = new Emission();

			//  define the (immutable) on/off methods
			define(model, 'on', true, result.add, false);
			define(model, 'off', true, result.remove, false);

			//  kontext itself can (and will) emit update 'events' when models are updated
			//  therefor we subscribe to model updates and re-send them
			if (typeof model === 'object') {
				model.on('update', function(mod, key, prior, current) {
					emission.trigger('update', [mod, key, prior, current]);
				});
			}

			//  return the emission
			return result;
		}

		/**
		 *  Update elements to reflect a new value
		 *  @name    update
		 *  @access  internal
		 *  @param   Array     elements
		 *  @param   function  delegation
		 *  @return  void
		 */
		function update(list, delegation) {
			var nodeValue = '' + delegation();

			list
				.filter(function(element) {
					return nodeValue !== element.nodeValue;
				})
				.forEach(function(element) {
					element.nodeValue = nodeValue;
				});
		}


		/**
		 *  Create a delegation function, responsible for keeping track of updates, associated elements and providing the data
		 *  @name    delegate
		 *  @access  internal
		 *  @param   mixed     initial value
		 *  @param   object    model  [optional, default undefined - no model]
		 *  @param   string    key    [optional, default undefined - no key]
		 *  @return  function  delegate
		 */
		function delegate(initial, model, key) {
			var config, result;

			result = function(value) {
				var change = arguments.length > 0,
					prior = config.value;

				//  update the value if the value argument was provided
				if (change) {
					config.value = value;
				}

				//  emit the appropriate event
				config.emission.trigger(
					change ? 'update' : 'access',
					[model, key, prior, config.value]
				);

				return config.value;
			};

			//  store a relevant value in an object, which can be passed on internally
			config = {
				emission: emitable(result),
				element: [],
				value: initial,
				model: model,
				key: key
			};

			//  if we are dealing with arrays, we'd like to know about mutations
			if (initial instanceof Array) {
				['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'].forEach(function(prop) {
					var original;

					if (typeof initial[prop] === 'function') {
						original = initial[prop];
						initial[prop] = function() {
							var rs = original.apply(initial, arguments);

							//  map the changes
							listPrepare(initial, config);  //  eslint-disable-line no-use-before-define
							config.emission.trigger('update', [model, key, config.value]);

							return rs;
						};
					}
				});

				listPrepare(initial, config);  //  eslint-disable-line no-use-before-define
			}

			//  create the scope method, used to register the scope (model + key) for delegates created externally
			result.scope = function() {
				if (!model && arguments.length > 0) {
					model = arguments[0];
				}

				if (!key && arguments.length > 1) {
					key = arguments[1];
				}
			};

			//  create the element method, used to register elements to the delegate
			result.element = function() {
				var append = castToArray(arguments);

				if (append) {
					append.forEach(function(node) {
						//  add observers to monitor changes
						observer.monitor(node, result);
					});

					//  update the newly added elements
					update(append, result);

					//  append the new elements to the existing ones (if any)
					config.element = config.element.concat(append);
				}

				//  return all configured elements
				return config.element;
			};

			//  listen for changes so these can be updated in the associated elements
			config.emission.add('update', function() {
				settings._('rAF')(function() {
					update(config.element, result);
				});
			});

			return result;
		}

		/**
		 *  Determine wether or not the provided value is a delegate
		 *  @name    isDelegate
		 *  @access  internal
		 *  @param   mixed  value
		 *  @return  bool   is delegate
		 */
		function isDelegate(value) {
			return typeof value === 'function' && typeof value.element === 'function';
		}

		/**
		 *  Obtain the delegate function applied to a model property by Kontext
		 *  @name    getDelegate
		 *  @access  internal
		 *  @param   object    model
		 *  @param   string    key
		 *  @return  function  delegate  [false, if no delegate was found]
		 */
		function getDelegate(model, key) {
			var result = false,
				property = key.split('.'),
				desc;

			//  deal with scoped keys such as 'foo.bar', which needs to address the 'bar' property in the submodel
			//  residing in model.foo
			property.forEach(function(name, index, all) {
				key = name in model ? name : null;

				if (key && index < all.length - 1) {
					model = model[key];
				}
			});

			if (key && key in model) {
				//  if a model key is an explicitly assigned delegate, we utilize it
				if (isDelegate(model[key])) {
					result = model[key];
				}

				//  otherwise we need to get the property descriptor first
				else {
					desc = Object.getOwnPropertyDescriptor(model, key);
					result = desc.get;
				}
			}

			return result;
		}

		/**
		 *  Prepare models so all properties become delegates (if not already) and it becomes an emitable
		 *  @name    prepare
		 *  @access  internal
		 *  @param   model
		 *  @return  model
		 */
		function prepare(model) {
			var emitter;

			if (!('on' in model && 'off' in model && 'delegation')) {
				//  replace any key with a delegate
				eachKey(model, function(key, value) {
					var handle;

					if (!getDelegate(model, key)) {
						handle = delegate(value, model, key);

						//  add the delegated handle as both getter and setter on the model/key
						define(model, key, true, handle, handle);

						//  a change emission on a property will trigger an update on the model
						handle.on('update', function(m, k, prior, current) {
							emitter.trigger('update', [model, key, prior, current]);
						});
					}

					//  if the value is an object, we prepare it aswel so we can actually work with
					//  scoped properties
					if (value && typeof value === 'object' && !(value instanceof Array)) {
						//  prepare the submodel
						prepare(value);

						//  register a handler to pass on the update events to the parent model
						//  with the key prefixed
						value.on('update', function(parent, property, prior, current) {
							emitter.trigger('update', [model, key + '.' + property, prior, current]);
						});
					}
				});

				//  add the emission methods
				emitter = emitable(model);

				//  add the delegation method
				define(model, 'delegation', true, function(key) {
					return getDelegate(model, key);
				}, false);
			}

			return model;
		}

		/**
		 *  Prepare a list of (possible) models
		 *  @name    listPrepare
		 *  @access  internal
		 *  @param   array   list
		 *  @param   object  config
		 *  @param   array   subscriber
		 */
		function listPrepare(list, config) {
			var proto = Array.prototype,
				numeric = /^[0-9]+$/;

			//  determine if the list has been given additional properties and delegate those
			eachKey(list, function(key, value) {
				var handle;

				if (!(numeric.test(key) || key in proto || isDelegate(value))) {
					handle = delegate(value, list, key);

					//  add the delegated handle as both getter and setter on the list key
					define(list, key, true, handle, handle);
				}
			});

			//  iterator over every item in the list and ensure it is a model on its own
			list.forEach(function(item, index) {
				if (typeof list[index] === 'object') {
					list[index] = prepare(item, config.model, config.key);
					list[index].on('update', function() {
						config.emission.trigger('update', [config.model, config.key, config.value]);
					});
				}
			});
		}

		/**
		 *  Register or obtain bindings
		 *  @name    bindings
		 *  @access  internal
		 *  @param   DOMNode  element
		 *  @param   Object   model
		 *  @return  mixed    result  [if a model was provided - void, the list of models for given element]
		 */
		function bindings(element, model) {
			var list = settings._('bindings') || [],
				ancestry;

			//  if a model is provided, we associate it with the element, otherwise a list of models
			//  already associated with the element will be returned
			if (model) {
				list.push({model: model, target: element});
				settings._('bindings', list);
			}
			else {
				ancestry = [element];

				//  obtain a the ancestry (parent relations) for the given element
				while (ancestry[ancestry.length - 1].parentNode) {
					ancestry.push(ancestry[ancestry.length - 1].parentNode);
				}

				return list

					//  narrow the list down to all bindings having an element in the ancestry-list
					.filter(function(binding) {
						return ancestry.indexOf(binding.target) >= 0;
					})

					//  map the left over bindings to represent only models
					.map(function(binding) {
						return binding.model;
					})

					//  narrow down the list so the returned models are unique
					.filter(function(mod, index, all) {
						return index === all.indexOf(mod);
					});
			}
		}

		/**
		 *  Expand all DOMNode(List) in the provided list to individual and unique DOMNodes
		 *  @name    expandNodeList
		 *  @access  internal
		 *  @param   mixed  key    [one of: string key, object, undefined]
		 *  @param   mixed  value  [optional (ignored if key is an object), default undefined - no value]
		 *  @return  mixed  value  [if a string key is provided, the value for the key, all options otherwise]
		 */
		function expandNodeList(list) {
			return !list.length ? [document.body] : list
				.reduce(function(all, current) {
					return all.concat(current.nodeName ? [current] : castToArray(current));
				}, [])
				.filter(function(node, index, all) {
					return all.indexOf(node) === index;
				});
		}

		/**
		 *  Get/set the default options
		 *  @name    defaults
		 *  @access  public
		 *  @param   mixed  key    [one of: string key, object, undefined]
		 *  @param   mixed  value  [optional (ignored if key is an object), default undefined - no value]
		 *  @return  mixed  value  [if a string key is provided, the value for the key, all options otherwise]
		 */
		kontext.defaults = function(key, value) {
			if (key) {
				return settings.public(key, value);
			}

			return settings.public();
		};

		/**
		 *  Register a handler to be invoked when Kontext is ready (DOM-ready)
		 *  @name    ready
		 *  @access  public
		 *  @param   function  callback
		 *  @return  object    kontext
		 */
		kontext.ready = function(callback) {
			var state = settings._('ready');

			//  register the callback for the 'ready' emission, to be executed only once
			emission.add('ready', callback, 1);

			//  the internal state is undefined for as long as the 'ready' emission has not been
			//  triggered, it will be true/false afterwards
			/* istanbul ignore next */
			if (state !== undefined) {
				emission.trigger('ready', [state !== true ? state : undefined, state === true ? kontext : undefined]);
			}

			return kontext;
		};

		/**
		 *  Register an event handler
		 *  @name    on
		 *  @access  public
		 *  @param   string    type
		 *  @param   function  handle
		 *  @return  function  handle
		 */
		kontext.on = function(type, handle) {
			return emission.add(type, handle);
		};

		/**
		 *  Remove an event handler
		 *  @name    off
		 *  @access  public
		 *  @param   string    type
		 *  @param   function  handle
		 *  @return  Array     removed handles
		 */
		kontext.off = function(type, handle) {
			return emission.remove(type, handle);
		};

		/**
		 *  Register extentions
		 *  @name    extension
		 *  @access  public
		 *  @param   string    name
		 *  @param   function  handle
		 *  @return  void
		 */
		kontext.extension = extension;

		/**
		 *  Create a delegation value with an initial value
		 *  @name    delegate
		 *  @access  public
		 *  @param   mixed     initial value
		 *  @return  function  delegate
		 */
		kontext.delegate = function(initial) {
			return delegate(initial);
		};

		/**
		 *  Bind a model to an element, this also prepares the model so event emissions can be triggered
		 *  @name    bind
		 *  @access  public
		 *  @param   object   model
		 *  @param   DOMNode  element...  [optional, default undefined - the document.body]
		 *  @param   Object   options     [optional, default undefined - use the default settings]
		 *  @return  object   model
		 */
		kontext.bind = function() {
			var arg = castToArray(arguments),
				model = prepare(arg.shift()),
				pop = arg.length && !contains(arg[arg.length - 1], ['nodeType', 'length'], 1),
				options = settings.combine(pop ? arg.pop() : {});

			//  bind the model to each element provided
			expandNodeList(arg).forEach(function(element) {
				//  register the bond, so we can retrieve it later on
				bindings(element, model);

				//  work through all data-kontext (or configured override thereof) attributes
				//  within (inclusive) given element
				//  Attribute.find will do the filtering of unparsable/unavailable target
				new Attribute().find(options.attribute, element, function(target, opt) {
					//  traverse all the keys present in the attribute value, for these represent
					//  individual extensions
					eachKey(opt, function(key, config) {
						var ext = extension(key);

						ext(target, model, config, kontext);
					});
				});

				//  work through all placeholders in DOMText nodes within (inclusive) within the element
				new Text(options.pattern).placeholders(element, function(text, key, initial) {
					var delegated = getDelegate(model, key);

					//  if there is a delegation, we provide the scope
					//  (only effective if no scope has been set)
					if (delegated) {
						delegated.scope(model, key);

						//  if there is no (false-ish) value, we set the initial value from the textNode
						//  (which may still be an empty string)
						if (!delegated()) {
							delegated(initial);
						}
					}
					else if (options.greedy) {
						//  create the delegate function
						delegated = delegate(initial, model, key);

						//  add the delegate function as getter/setter on the model
						define(model, key, true, delegated, delegated);
					}

					//  if Kontext created the delegate, we should register the element to the delegation
					if (delegated) {
						delegated.element(text);
					}
				});
			});

			return model;
		};

		/**
		 *  Obtain the model(s) influencing the provided element
		 *  @name    ties
		 *  @access  public
		 *  @param   DOMNode  element  [optional, default undefined - the document.body element]
		 *  @return  Array    models
		 */
		kontext.bindings = function(element) {
			return bindings(element || document.body);
		};

		init();
	}

	//  create a new Kontext instance in the global scope
	global.kontext = global.kontext || new Kontext();

})(window);
