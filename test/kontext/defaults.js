/*global kontext, describe, it, expect*/
describe('Kontext Defaults', function() {
	'use strict';

	it('defaults contain.. defaults', function(done) {
		var a = kontext.defaults();

		expect(a.greedy).toBe(true);
		expect(a.attribute).toBe('data-kontext');

		done();
	});

	it('defaults can be changed, reflected in all referenced defaults', function(done) {
		var a = kontext.defaults();

		expect(a.greedy).toBe(true);
		expect(kontext.defaults().greedy).toBe(true);

		a.greedy = false;
		expect(a.greedy).toBe(false);
		expect(kontext.defaults().greedy).toBe(false);

		kontext.defaults({greedy: true});
		expect(a.greedy).toBe(true);
		expect(kontext.defaults().greedy).toBe(true);

		done();
	});

	it('prefers object types', function(done) {
		kontext.defaults({a: {b: {c: 1}}});
		expect(kontext.defaults().a.b).toEqual({c: 1});

		done();
	});

	it('ignores non-object default settings', function(done) {
		var a = kontext.defaults(),
			b = kontext.defaults('nope');

		expect(a).toBe(b);

		done();
	});
});
