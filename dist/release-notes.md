# Release notes

## 1.3.0
The main focus of this release was to provide a more consistent approach to allow for variable scoping for all extensions.

### Fixes
- `attribute`-extension
	- added support for variable scoping
	- reduced internal overhead (performance improvement)
- `css`-extension
	- fixed potential issue with removal of className
	- added support for variable scoping
	- reduced internal overhead (performance improvement)
- `each`-extension
	- added support for variable scoping
	- added internal documentation (docblocks/flow)
	- reduced internal overhead and complexity (performance improvement)
- `html`-extension
	- simplified even further, making it the perfect example of extension simplicity
- `input`-extensions
	- full module refactoring
	- added support for variable scoping
	- added internal documentation (docblocks/flow)
	- checkbox/radio inputs now support values from the model (including updates initiated by the model)
	- options for `<select>`-elements now also respond to model updates *if provided by the model*
	- fixed complexity issues (reported by Codacy)
	- performance improvement
- `template`-extension
	- added support for variable scoping

### What is "variable scoping"?
Models can contain other models, referring to those in javascript is simple, for example; `model.some.deeper.property = 'value'`. In most extensions this was not implemented properly, so this needed to be corrected.

#### Example usage
All extensions using values from models to control behavior and/or content, the syntax is the same

```html
<h2 data-kontext="text: model.some.deeper.property">..</h2>
<ul data-kontext="each: some.deeper.list">
	<li>...</li>
</ul>
```

### Statistics
- Full size: 61.4K (+3.6K)
- Minified size: 14.4K (**-0.3K**)


## 1.2.0
Fixed issue with `NodeList` as last argument to `kontext.bind`, added the option to use dynamic templates.


### Fixes
- Fixed issue where a `NodeList` as last argument to `kontext.bind` would be used as `options`-object
- Internally the `NodeList` approach is now consistently used in favor of the previous Array approach


### Dynamic template
The `template`-extension now supports dynamic template names by using the object configuration with a `value` key refering to the model property to respond to.

#### Example usage
Using a model like `{myTemplate: '#test'}`, the following example would update the contents to another template if the `myTemplate` property is changed.

```html
<div data-kontext="template: {value: myTemplate}">replaced</div>
```

### Statistics
- Full size: 57.7K (+0.7K)
- Minified size: 14.7K (+0.2K)



## 1.1.0
Added the option to abbreviate extension names, allow for NodeLists to be used for binding and added the `Template`-extension.


### Fixes
none


### Abbreviated extension names
Using extensions now has a slightly more convenient syntax, as all extension names can be used with a shorter notation.
The logic behind it is simple;
- first look if the exact name matches a registered extension name, if an extension matches it is returned
- if the exact name is not an extension, create an internal list of all extension names which start with the provided name
- if the list of matched extensions contains just one extension, it is returned
- if the list of matched extensions exceeds one, an error is provided mentioning the names of the matching extensions
- if there are no matching extensions, an error is provided mentioning the extension is unknown

#### Example usage
```html
<div data-kontext="attribute: {data-foo: bar}">...</div>
```

Can now be written as
```html
<div data-kontext="attr: {data-foo: bar}">...</div>
```

Or even
```html
<div data-kontext="a: {data-foo: bar}">...</div>
```
Although this would lead to errors as soon as another extension is added whose name starts with an `a`. A safe minimum amount of characters would be around 4 (e.g. `attr`), but this is not enforced by Kontext.

#### Controlling this behavior
The abbreviation can be turned on/off by setting the `abbreviateExtensions` to `true` (this is the default) or `false` if you don't want to allow extension names to be abbreviated.


### NodeList binding
Since the initial launch of Kontext, it has been possble to provide a list of elements to be bound to a model using `kontext.bind(model, elementA, elementB)`. As of this release it is possible to provide `NodeList` objects, such as `element.childNodes`, `document.querySelectorAll` and `document.getElementsByTagName`.
This should reduce the need to mangle arrays (which are supported too) and invoke `kontext.bind` using `apply`.


### `Template`-extension
Added the `template`-extension, allowing to replace the contents of the element from both internal and external sources.

#### Example usage
In its most basic use, the template to be used is configured by providing a string value consisting or a path, an id or both.

```html
//  load foo.html into the element
<div data-kontext="template: foo.html">replaced</div>

//  load the contents of an element with the id 'bar' from the foo.html template
<div data-kontext="template: foo.html#bar">replaced</div>

//  load the contents of an element with id 'bar' from the current document
<div data-kontext="template: #bar">replaced</div>
```

For more elaborate configuration, an object syntax is also supported, this provides the option to specify selectors other than `#id`-selectors.

```html
//  load the contents of an element with the attribute data-template matching 'bar'
//  from the /path/to/template template
<div data-kontext="template: {path: /path/to/template, selector: '[data-template=bar]'}">replaced</div>
```

### Statistics
- Full size: 49.7K (+7.6K)
- Minified size: 14.5K (+2.3K)