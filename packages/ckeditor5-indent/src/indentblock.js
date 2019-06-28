/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module indent/indentblock
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

import IndentBlockCommand from './indentblockcommand';
import IndentUsingOffset from './indentcommandbehavior/indentusingoffset';
import IndentUsingClasses from './indentcommandbehavior/indentusingclasses';

/**
 * The block indentation feature.
 *
 * It registers the `'indentBlock'` and `'outdentBlock'` commands.
 *
 * If the plugin {@link module:indent/indent~Indent} is defined it also attaches the `'indentBlock'` and `'outdentBlock'` commands to
 * `'indent'` and `'outdent'` commands.
 *
 * @extends module:core/plugin~Plugin
 */
export default class IndentBlock extends Plugin {
	/**
	 * @inheritDoc
	 */
	constructor( editor ) {
		super( editor );

		editor.config.define( 'indentBlock', {
			offset: 40,
			unit: 'px'
		} );
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'IndentBlock';
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const schema = editor.model.schema;
		const conversion = editor.conversion;
		const configuration = editor.config.get( 'indentBlock' );

		// Enable block indentation by default in paragraph and default headings.
		const knownElements = [ 'paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6' ];

		knownElements.forEach( elementName => {
			if ( schema.isRegistered( elementName ) ) {
				schema.extend( elementName, { allowAttributes: 'blockIndent' } );
			}
		} );

		const useOffsetConfig = !configuration.classes || !configuration.classes.length;

		const indentConfig = Object.assign( { direction: 'forward' }, configuration );
		const outdentConfig = Object.assign( { direction: 'backward' }, configuration );

		if ( useOffsetConfig ) {
			this._setupConversionUsingOffset( conversion );
			editor.commands.add( 'indentBlock', new IndentBlockCommand( editor, new IndentUsingOffset( indentConfig ) ) );
			editor.commands.add( 'outdentBlock', new IndentBlockCommand( editor, new IndentUsingOffset( outdentConfig ) ) );
		} else {
			this._setupConversionUsingClasses( configuration.classes );
			editor.commands.add( 'indentBlock', new IndentBlockCommand( editor, new IndentUsingClasses( indentConfig ) ) );
			editor.commands.add( 'outdentBlock', new IndentBlockCommand( editor, new IndentUsingClasses( outdentConfig ) ) );
		}
	}

	/**
	 * @inheritDoc
	 */
	afterInit() {
		const editor = this.editor;
		const indentCommand = editor.commands.get( 'indent' );
		const outdentCommand = editor.commands.get( 'outdent' );

		indentCommand.registerChildCommand( editor.commands.get( 'indentBlock' ) );
		outdentCommand.registerChildCommand( editor.commands.get( 'outdentBlock' ) );
	}

	/**
	 * Setups conversion for using offset indents.
	 *
	 * @private
	 */
	_setupConversionUsingOffset() {
		const conversion = this.editor.conversion;

		conversion.for( 'upcast' ).attributeToAttribute( {
			view: {
				styles: {
					'margin-left': /[\s\S]+/
				}
			},
			model: {
				key: 'blockIndent',
				value: viewElement => viewElement.getStyle( 'margin-left' )
			}
		} );

		// The margin shorthand should also work.
		conversion.for( 'upcast' ).attributeToAttribute( {
			view: {
				styles: {
					'margin': /[\s\S]+/
				}
			},
			model: {
				key: 'blockIndent',
				value: viewElement => normalizeToMarginLeftStyle( viewElement.getStyle( 'margin' ) )
			}
		} );

		conversion.for( 'downcast' ).attributeToAttribute( {
			model: 'blockIndent',
			view: modelAttributeValue => {
				return {
					key: 'style',
					value: {
						'margin-left': modelAttributeValue
					}
				};
			}
		} );
	}

	/**
	 * Setups conversion for using classes.
	 *
	 * @param {Array.<String>} classes
	 * @private
	 */
	_setupConversionUsingClasses( classes ) {
		const definition = {
			model: {
				key: 'blockIndent',
				values: []
			},
			view: {}
		};

		for ( const className of classes ) {
			definition.model.values.push( className );
			definition.view[ className ] = {
				key: 'class',
				value: [ className ]
			};
		}

		this.editor.conversion.attributeToAttribute( definition );
	}
}

// Normalizes the margin shorthand value to the value of `margin-left` CSS property.
//
// As such it will return:
// - '1em' for '1em'
// - '1em' for '2px 1em'
// - '1em' for '2px 1em 3px'
// - '1em' for '2px 10px 3px 1em'
//
// @param {String} Margin style value.
// @returns {String} Extracted value of margin-left.
function normalizeToMarginLeftStyle( marginStyleValue ) {
	// Splits the margin shorthand, ie margin: 2em 4em.
	const marginEntries = marginStyleValue.split( ' ' );

	let left;

	// If only one value defined, ie: `margin: 1px`.
	left = marginEntries[ 0 ];

	// If only two values defined, ie: `margin: 1px 2px`.
	if ( marginEntries[ 1 ] ) {
		left = marginEntries[ 1 ];
	}

	// If four values defined, ie: `margin: 1px 2px 3px 4px`.
	if ( marginEntries[ 3 ] ) {
		left = marginEntries[ 3 ];
	}

	return left;
}

/**
 * The configuration of the {@link module:indent/indentblock~IndentBlock block indentation feature}.
 *
 * Read more in {@link module:indent/indentblock~IndentBlockConfig}.
 *
 * @member {module:indent/indentblock~IndentBlockConfig} module:core/editor/editorconfig~EditorConfig#indentBlock
 */

/**
 * The configuration of the block indentation feature.
 *
 * If no {@link module:indent/indentblock~IndentBlockConfig#classes} are set the block indentation feature will use
 * {@link module:indent/indentblock~IndentBlockConfig#offset} and {@link module:indent/indentblock~IndentBlockConfig#unit} to
 * create indentation steps.
 *
 *		ClassicEditor
 *			.create( editorElement, {
 * 				indentBlock: {
 *					offset: 2,
 *					unit: 'em'
 * 				}
 *			} )
 *			.then( ... )
 *			.catch( ... );
 *
 * Alternatively the block indentation feature may set one of defined {@link module:indent/indentblock~IndentBlockConfig#classes} as
 * indentation steps:
 *
 *		ClassicEditor
 *			.create( editorElement, {
 * 				indentBlock: {
 *					classes: [
 *						'indent-a', // First step - smallest indentation.
 *						'indent-b',
 *						'indent-c',
 *						'indent-d',
 *						'indent-e' // Last step - biggest indentation.
 *					]
 * 				}
 *			} )
 *			.then( ... )
 *			.catch( ... );
 *
 * In the above example only 5 indentation steps will be available.
 *
 * See {@link module:core/editor/editorconfig~EditorConfig all editor options}.
 *
 * @interface IndentBlockConfig
 */

/**
 * The size in indentation {@link module:indent/indentblock~IndentBlockConfig#unit units} of each indentation step.
 *
 * @default 40
 * @member {Number} module:indent/indentblock~IndentBlockConfig#offset
 */

/**
 * The unit used for indentation {@link module:indent/indentblock~IndentBlockConfig#offset}.
 *
 * @default 'px'
 * @member {String} module:indent/indentblock~IndentBlockConfig#unit
 */

/**
 * An optional list of classes to use for indenting the contents. If not set or set to empty array, no classes will be used and instead
 * the {@link module:indent/indentblock~IndentBlockConfig#unit `indentBlock.unit`} and
 * {@link module:indent/indentblock~IndentBlockConfig#offset `indentBlock.offset`} properties will be used.
 *
 * @default undefined
 * @member {Array.<String>|undefined} module:indent/indentblock~IndentBlockConfig#classes
 */
