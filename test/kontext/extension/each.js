/*global kontext, describe, afterEach, beforeEach, it, expect, spyOn*/
describe('Kontext Extension Each', function() {
	'use strict';

	var element;

	beforeEach(function(done) {
		element = document.createElement('div');
		element.appendChild(document.createElement('strong')).appendChild(document.createTextNode('{a} and {b}'));

		done();
	});

	afterEach(function(done) {
		if (element) {
			if (element.parentNode) {
				element.parentNode.removeChild(element);
			}

			element = null;
		}

		done();
	});

	it('reflects the items in bound array', function(done) {
		var model;

		element.setAttribute('data-kontext', 'each: list');
		model = kontext.bind({list: []}, element);

		model.on('update', function(mod, key) {
			expect(element.childNodes.length).toBe(mod[key].length);

			if (mod[key].length < 5) {
				mod[key].push({
					a: 'a' + mod[key].length,
					b: 'b' + mod[key].length
				});
			}
			else {
				done();
			}
		});

		expect(element.childNodes.length).toBe(0);

		model.list.push({
			a: 'initial',
			b: 'initial'
		});
	});

	it('works with settings in objects', function(done) {
		var model;

		element.setAttribute('data-kontext', 'each: {target: list}');
		model = kontext.bind({list: []}, element);

		model.on('update', function(mod, key) {
			expect(element.childNodes.length).toBe(mod[key].length);

			if (mod[key].length < 5) {
				mod[key].push({
					a: 'a' + mod[key].length,
					b: 'b' + mod[key].length
				});
			}
			else {
				done();
			}
		});

		expect(element.childNodes.length).toBe(0);

		model.list.push({
			a: 'initial',
			b: 'initial'
		});
	});

	it('filters using a single model method', function(done) {
		var model;

		element.setAttribute('data-kontext', 'each: {target: list, filter: even}');
		model = kontext.bind({
			list: [],
			even: function(m, i) {
				return i % 2 === 0;
			}
		}, element);

		model.on('update', function(mod, key) {
			var expectation = model.list.filter(model.even);

			expect(element.childNodes.length).toBe(expectation.length);

			if (mod[key].length < 5) {
				mod[key].push({
					a: 'a' + mod[key].length,
					b: 'b' + mod[key].length
				});
			}
			else {
				done();
			}
		});

		expect(element.childNodes.length).toBe(0);

		model.list.push({
			a: 'initial',
			b: 'initial'
		});
	});

	it('filters using an array of model methods and global/window functions', function(done) {
		var model;

		window.skipFirst = function(m, i) {
			return i > 0;
		};

		element.setAttribute('data-kontext', 'each: {target: list, filter: [even, skipFirst]}');
		model = kontext.bind({
			list: [],
			even: function(m, i) {
				return i % 2 === 0;
			}
		}, element);

		model.on('update', function(mod, key) {
			var expectation = model.list.filter(model.even).filter(window.skipFirst);

			expect(element.childNodes.length).toBe(expectation.length);

			if (mod[key].length < 5) {
				mod[key].push({
					a: 'a' + mod[key].length,
					b: 'b' + mod[key].length
				});
			}
			else {
				done();
			}
		});

		expect(element.childNodes.length).toBe(0);

		model.list.push({
			a: 'initial',
			b: 'initial'
		});
	});

	it('removes elements which are no longer needed', function(done) {
		var model;

		element.setAttribute('data-kontext', 'each: list');
		element.removeChild(element.firstChild);
		element.appendChild(document.createElement('div')).appendChild(document.createTextNode('{$item}'));

		model = kontext.bind({
			list: ['a', 'b', 'c']
		}, element);

		model.list.splice(1, 1);

		setTimeout(function() {
			expect(element.childNodes.length).toBe(model.list.length);
			expect(element.childNodes[0].firstChild.data).toBe('a');
			expect(element.childNodes[1].firstChild.data).toBe('c');

			done();
		}, 100);
	});

	it('throws errors if there is no target', function(done) {
		element.setAttribute('data-kontext', 'each: {}');

		expect(function() {
			kontext.bind({list: []}, element);
		}).toThrow(new Error('Missing target for "each"'));

		done();
	});

	it('throws errors if there if a filter method/function does not exist', function(done) {
		element.setAttribute('data-kontext', 'each: {target: list, filter: nope}');

		expect(function() {
			kontext.bind({list: []}, element);
		}).toThrow(new Error('nope is not a filter function'));

		done();
	});

	it('throws errors if there if a map method/function does not exist', function(done) {
		element.setAttribute('data-kontext', 'each: {target: list, map: nope}');

		expect(function() {
			kontext.bind({list: []}, element);
		}).toThrow(new Error('nope is not a map function'));

		done();
	});
});