/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';
import { createBlock } from '@wordpress/blocks';

const NAVIGATION_SUBMENU_TRANSFORMS = {
	to: [
		{
			type: 'block',
			blocks: [ 'core/navigation-link' ],
			transform: ( attributes ) =>
				createBlock( 'core/navigation-link', attributes ),
		},
	],
};

const NAVIGATION_LINK_TRANSFORMS = {
	to: [
		{
			type: 'block',
			blocks: [ 'core/navigation-submenu' ],
			transform: ( attributes, innerBlocks ) =>
				createBlock(
					'core/navigation-submenu',
					attributes,
					innerBlocks
				),
		},
	],
};

export default function removeUnsupportedTransforms( settings, name ) {
	if (
		name !== 'core/navigation-link' ||
		name !== 'core/navigation-submenu'
	) {
		return settings;
	}

	const transforms =
		name === 'core/navigation-link'
			? NAVIGATION_LINK_TRANSFORMS
			: NAVIGATION_SUBMENU_TRANSFORMS;

	return { ...settings, transforms };
}

// importing this file includes side effects. This is whitelisted in package.json under sideEffects
addFilter(
	'blocks.registerBlockType',
	'core/edit-navigation',
	removeUnsupportedTransforms
);
