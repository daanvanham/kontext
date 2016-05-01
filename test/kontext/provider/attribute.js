/*global kontext: true, describe: true, it: true, expect: true, beforeEach: true, afterEach: true*/
describe('Kontext Provider Attribute', function() {
	'use strict';

	var provider = kontext.provider('attribute');

	it('attribute provider exists', function() {
		expect(typeof provider).toBe('function');
	});

	describe('finds all placeholders', function() {
		var main, collect, a, b;

		beforeEach(function(done) {
			main = document.createElement('main');

			main.setAttribute('data-kontext', 'hello: world');

			a = main.appendChild(document.createElement('div'));
			a.setAttribute('data-kontext', 'nested: {key: value}');

			b = main.appendChild(document.createElement('div'));
			b.setAttribute('data-kontext', 'first: true, third: true, second: true');

			collect = [];

			done();
		});

		afterEach(function(done) {
			if (main.parentNode) {
				main.parentNode.removeChild(main);
			}

			done();
		});

		function runner(node, conclusion) {
			provider(kontext.defaults(), node, function(target, options) {
				expect(target.nodeType).toBe(1);

				if (target === main) {
					expect(options).toEqual({hello: 'world'});
				}
				else if (target === a) {
					expect(options).toEqual({nested: {key: 'value'}});
				}
				else if (target === b) {
					expect(options).toEqual({first: true, second: true, third: true});
				}

				collect.push(target);
			});

			conclusion();
		}

		it('elements', function() {
			runner(main, function() {
				expect(collect).toEqual([main, a, b]);
			});
		});

		it('empty elements', function() {
			runner(document.createElement('div'), function() {
				expect(collect).toEqual([]);
			});
		});

		it('DOMDocumentFragment', function() {
			var fragment = document.createDocumentFragment();

			fragment.appendChild(main);

			runner(fragment, function() {
				expect(collect).toEqual([main, a, b]);
			});
		});

		it('empty DOMDocumentFragment', function() {
			runner(document.createDocumentFragment(), function() {
				expect(collect).toEqual([]);
			});
		});

		it('DOMDocument', function() {
			document.body.appendChild(main);

			runner(document, function() {
				expect(collect).toEqual([main, a, b]);
			});
		});

		it('empty DOMDocument', function() {
			runner(document, function() {
				expect(collect).toEqual([]);
			});
		});
	});

	it('allowes for whitespace (newlines,tabs) in attribute', function() {
		var main = document.createElement('main');

		main.setAttribute('data-kontext', '  foo: {bar: baz},\n\t\t\t\t\r   last: false\n\n\n\t\t\t,\n\n\n\t\t\t\t    \t\n  \rfinal: "tru\\"e"  ,  ');

		provider(kontext.defaults(), main, function(target, config) {
			expect('foo' in config).toBe(true);
			expect('bar' in config.foo).toBe(true);
			expect(config.foo.bar).toBe('baz');

			expect('last' in config).toBe(true);

			//  (not boolean, as there is whitespace before the 'end' comma)
			expect(typeof config.last).toBe('string');
			expect(/^false\s+$/.test(config.last)).toBe(true);

			expect('final' in config).toBe(true);
			expect(config.final).toBe('tru"e');
		});
	});

	it('does not trip over non-elements', function() {
		var collect = [];

		provider(kontext.defaults(), null, function(target) {
			collect.push(target);
		});

		expect(collect.length).toBe(0);
	});

	describe('does not trip over empty attributes', function() {
		['', null, '   ', 0, false, '\t\n\r ']
			.forEach(function(data) {
				it(JSON.stringify(data), function() {
					var main = document.createElement('main'),
						collect = [];

					main.setAttribute('data-kontext', '');

					provider(kontext.defaults(), main, function(target, config) {
						collect.push(config);
					});

					expect(collect.length).toBe(0);
				});
			});
	});

	describe('prevents handling removed childNodes', function() {
		var main, element, removal, collect;

		beforeEach(function(done) {
			main = document.createElement('main'),
			element = main.appendChild(document.createElement('div')),
			removal = main.appendChild(document.createElement('div')),
			collect = [];

			element.setAttribute('data-kontext', 'available: yes');
			removal.setAttribute('data-kontext', 'available: no');

			done();
		});

		afterEach(function(done) {
			if (main.parentNode) {
				main.parentNode.removeChild(main);
			}

			done();
		});

		function runner(node, conclusion) {
			provider(kontext.defaults(), node, function(target, config) {
				collect.push(target);

				expect(target).toBe(element);
				expect('available' in config).toBe(true);
				expect(config.available).toBe('yes');

				removal.parentNode.removeChild(removal);
			});

			conclusion();
		}

		it('elements', function() {
			runner(main, function() {
				expect(collect.length).toBe(1);
				expect(collect.indexOf(element)).toBe(0);
				expect(collect.indexOf(removal)).toBe(-1);
			});
		});

		it('DOMDocumentFragment', function() {
			var fragment = document.createDocumentFragment();

			fragment.appendChild(main);

			runner(fragment, function() {
				expect(collect.length).toBe(1);
				expect(collect.indexOf(element)).toBe(0);
				expect(collect.indexOf(removal)).toBe(-1);
			});
		});

		it('DOMDocument', function() {
			document.body.appendChild(main);

			runner(document, function() {
				expect(collect.length).toBe(1);
				expect(collect.indexOf(element)).toBe(0);
				expect(collect.indexOf(removal)).toBe(-1);
			});
		});
	});
});
